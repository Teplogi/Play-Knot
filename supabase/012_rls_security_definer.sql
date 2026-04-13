-- ============================================
-- 12. SECURITY DEFINER による RLS 再帰回避と service_role 撤廃
-- ============================================
--
-- 背景:
--   1) team_members の SELECT ポリシーが team_members 自身を参照する
--      自己再帰サブクエリで、Postgres の RLS 再帰検出に引っかかりうる。
--      api/schedules/route.ts などは「RLS 再帰回避のため」と理由を
--      明記して service_role を使い回避していた。
--   2) users の SELECT ポリシーが「self only」のため、team_members を
--      JOIN すると他メンバーの users 行が NULL になり UI が crash。
--      これを避けるため 12 箇所で service_role でバイパスしていた。
--
-- 対応:
--   A. SECURITY DEFINER ヘルパー関数で RLS を内部的にバイパスし、
--      ポリシーから自己参照サブクエリを排除（再帰解消）。
--   B. users の SELECT を「同じチームのメンバー同士は全フィールド可視」
--      に緩和。
--   C. RLS と本質的に相性が悪い 4 操作（チーム新規作成 / 招待受諾 /
--      オーナー譲渡 / public.users 行存在保証）を SECURITY DEFINER の
--      RPC として切り出し、アプリ側から service_role を完全撤廃可能に
--      する。
--
-- 変更後はアプリ側の createServiceClient 利用を順次撤廃する（別 PR）。
-- 旧コード（service_role 経由）は RLS を完全バイパスするため、本
-- マイグレーション適用直後でも壊れない。

-- ============================================
-- A. SECURITY DEFINER ヘルパー関数
-- ============================================
-- すべて search_path 固定で安全側に倒す。
-- STABLE: 同一クエリ内でキャッシュされる。

-- 自分の所属チーム ID 一覧
CREATE OR REPLACE FUNCTION public.get_my_team_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT team_id FROM public.team_members WHERE user_id = auth.uid();
$$;

-- 当該チームのメンバーか
CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND user_id = auth.uid()
  );
$$;

-- 当該チームの host または co_host か（書き込み権限）
CREATE OR REPLACE FUNCTION public.is_team_host(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id
      AND user_id = auth.uid()
      AND role IN ('host', 'co_host')
  );
$$;

-- 当該チームの host のみ（削除・譲渡用）
CREATE OR REPLACE FUNCTION public.is_team_owner(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id
      AND user_id = auth.uid()
      AND role = 'host'
  );
$$;

-- 同じチームに所属するユーザか（users SELECT 用）
CREATE OR REPLACE FUNCTION public.is_teammate(p_other_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members me
    JOIN public.team_members other ON other.team_id = me.team_id
    WHERE me.user_id = auth.uid()
      AND other.user_id = p_other_user_id
  );
$$;

-- 当該日程を閲覧可能か（attendances SELECT 用）
CREATE OR REPLACE FUNCTION public.can_view_schedule(p_schedule_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.schedules s
    JOIN public.team_members tm ON tm.team_id = s.team_id
    WHERE s.id = p_schedule_id
      AND tm.user_id = auth.uid()
  );
$$;

-- 自分の当該チームでの role を返す（NULL = 非所属）
CREATE OR REPLACE FUNCTION public.get_my_team_role(p_team_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.team_members
  WHERE team_id = p_team_id AND user_id = auth.uid()
  LIMIT 1;
$$;

-- 認証済みユーザに EXECUTE 権限を付与
GRANT EXECUTE ON FUNCTION public.get_my_team_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_host(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teammate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_schedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_team_role(uuid) TO authenticated;

-- ============================================
-- B. 既存ポリシーを差し替え
-- ============================================

-- ----- users -----
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (
    auth.uid() = id OR public.is_teammate(id)
  );
-- UPDATE は変更なし（self only）
-- 既存 users_update_own はそのまま

-- ----- teams -----
DROP POLICY IF EXISTS "teams_select" ON public.teams;
CREATE POLICY "teams_select" ON public.teams
  FOR SELECT USING (public.is_team_member(id));

-- INSERT は can_create_team 制約を維持（migration 010）
-- ※ 実運用上は RPC create_team 経由になるが、ポリシー自体は残す

DROP POLICY IF EXISTS "teams_host_write" ON public.teams;
CREATE POLICY "teams_host_write" ON public.teams
  FOR UPDATE USING (public.is_team_host(id));

DROP POLICY IF EXISTS "teams_host_delete" ON public.teams;
CREATE POLICY "teams_host_delete" ON public.teams
  FOR DELETE USING (public.is_team_owner(id));

-- ----- team_members -----
DROP POLICY IF EXISTS "team_members_select" ON public.team_members;
CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT USING (public.is_team_member(team_id));

DROP POLICY IF EXISTS "team_members_host_insert" ON public.team_members;
CREATE POLICY "team_members_host_insert" ON public.team_members
  FOR INSERT WITH CHECK (public.is_team_host(team_id));

DROP POLICY IF EXISTS "team_members_host_update" ON public.team_members;
CREATE POLICY "team_members_host_update" ON public.team_members
  FOR UPDATE USING (public.is_team_host(team_id));

DROP POLICY IF EXISTS "team_members_host_delete" ON public.team_members;
CREATE POLICY "team_members_host_delete" ON public.team_members
  FOR DELETE USING (public.is_team_host(team_id));

-- ----- schedules -----
DROP POLICY IF EXISTS "schedules_select" ON public.schedules;
CREATE POLICY "schedules_select" ON public.schedules
  FOR SELECT USING (public.is_team_member(team_id));

DROP POLICY IF EXISTS "schedules_host_insert" ON public.schedules;
CREATE POLICY "schedules_host_insert" ON public.schedules
  FOR INSERT WITH CHECK (public.is_team_host(team_id));

DROP POLICY IF EXISTS "schedules_host_update" ON public.schedules;
CREATE POLICY "schedules_host_update" ON public.schedules
  FOR UPDATE USING (public.is_team_host(team_id));

DROP POLICY IF EXISTS "schedules_host_delete" ON public.schedules;
CREATE POLICY "schedules_host_delete" ON public.schedules
  FOR DELETE USING (public.is_team_host(team_id));

-- ----- attendances -----
DROP POLICY IF EXISTS "attendances_select" ON public.attendances;
CREATE POLICY "attendances_select" ON public.attendances
  FOR SELECT USING (public.can_view_schedule(schedule_id));
-- INSERT/UPDATE は変更なし（self only）

-- ----- ng_pairs -----
DROP POLICY IF EXISTS "ng_pairs_host_select" ON public.ng_pairs;
CREATE POLICY "ng_pairs_host_select" ON public.ng_pairs
  FOR SELECT USING (public.is_team_host(team_id));

DROP POLICY IF EXISTS "ng_pairs_host_insert" ON public.ng_pairs;
CREATE POLICY "ng_pairs_host_insert" ON public.ng_pairs
  FOR INSERT WITH CHECK (public.is_team_host(team_id));

DROP POLICY IF EXISTS "ng_pairs_host_delete" ON public.ng_pairs;
CREATE POLICY "ng_pairs_host_delete" ON public.ng_pairs
  FOR DELETE USING (public.is_team_host(team_id));

-- ----- team_settings -----
-- 旧 009 の get_my_team_ids ベースから host 限定に厳格化
DROP POLICY IF EXISTS "team_settings_select" ON public.team_settings;
CREATE POLICY "team_settings_select" ON public.team_settings
  FOR SELECT USING (public.is_team_member(team_id));

DROP POLICY IF EXISTS "team_settings_upsert" ON public.team_settings;
CREATE POLICY "team_settings_insert" ON public.team_settings
  FOR INSERT WITH CHECK (public.is_team_host(team_id));

DROP POLICY IF EXISTS "team_settings_update" ON public.team_settings;
CREATE POLICY "team_settings_update" ON public.team_settings
  FOR UPDATE USING (public.is_team_host(team_id));

CREATE POLICY "team_settings_delete" ON public.team_settings
  FOR DELETE USING (public.is_team_host(team_id));

-- ----- invite_tokens -----
-- 「authenticated なら誰でも」だった verify/use 系は撤廃し、accept_invite RPC 経由に集約
DROP POLICY IF EXISTS "invite_tokens_verify" ON public.invite_tokens;
DROP POLICY IF EXISTS "invite_tokens_use" ON public.invite_tokens;

DROP POLICY IF EXISTS "invite_tokens_host_select" ON public.invite_tokens;
CREATE POLICY "invite_tokens_host_select" ON public.invite_tokens
  FOR SELECT USING (public.is_team_host(team_id));

DROP POLICY IF EXISTS "invite_tokens_host_insert" ON public.invite_tokens;
CREATE POLICY "invite_tokens_host_insert" ON public.invite_tokens
  FOR INSERT WITH CHECK (public.is_team_host(team_id));

CREATE POLICY "invite_tokens_host_delete" ON public.invite_tokens
  FOR DELETE USING (public.is_team_host(team_id));

-- ============================================
-- C. SECURITY DEFINER RPC
-- ============================================

-- ----- (1) チーム新規作成 -----
-- 「メンバー 0 人状態」での chicken-egg を回避。
-- can_create_team チェックを関数内で実施。
-- icon_color は indigo 固定（旧 API 実装に合わせる）。
CREATE OR REPLACE FUNCTION public.create_team(
  p_name text,
  p_sport_type text DEFAULT ''
)
RETURNS public.teams
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_can boolean;
  v_team public.teams;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'team name is required' USING ERRCODE = '22023';
  END IF;

  SELECT can_create_team INTO v_can
  FROM public.users WHERE id = v_user_id;

  IF NOT COALESCE(v_can, false) THEN
    RAISE EXCEPTION 'no permission to create team' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.teams (name, sport_type, icon_color, created_by)
  VALUES (trim(p_name), COALESCE(trim(p_sport_type), ''), 'indigo', v_user_id)
  RETURNING * INTO v_team;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_team.id, v_user_id, 'host');

  RETURN v_team;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_team(text, text) TO authenticated;

-- ----- (2) 招待トークン受諾 -----
-- 未参加ユーザが自分自身を team_members に入れる（ホストではないので
-- 通常の RLS では INSERT できない）。
-- 冪等: 既メンバーならそのまま team_id を返す。
-- 復旧: 自分が used_by の場合はもう一度 team_members 挿入を試みる。
CREATE OR REPLACE FUNCTION public.accept_invite(p_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_token public.invite_tokens;
  v_existing uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_token FROM public.invite_tokens WHERE token = p_token;
  IF v_token.id IS NULL THEN
    RAISE EXCEPTION 'invalid invite token' USING ERRCODE = '22023';
  END IF;

  IF v_token.expires_at < now() THEN
    RAISE EXCEPTION 'invite token expired' USING ERRCODE = '22023';
  END IF;

  -- 既メンバーなら冪等
  SELECT id INTO v_existing
  FROM public.team_members
  WHERE team_id = v_token.team_id AND user_id = v_user_id;
  IF v_existing IS NOT NULL THEN
    RETURN v_token.team_id;
  END IF;

  -- 別人が既に使用済みなら拒否（自分が used_by なら復旧扱いで進める）
  IF v_token.used_at IS NOT NULL
     AND v_token.used_by IS NOT NULL
     AND v_token.used_by <> v_user_id THEN
    RAISE EXCEPTION 'invite token already used' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_token.team_id, v_user_id, 'guest');

  UPDATE public.invite_tokens
  SET used_at = now(), used_by = v_user_id
  WHERE id = v_token.id;

  RETURN v_token.team_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite(uuid) TO authenticated;

-- ----- (3) オーナー譲渡 -----
-- 旧 host を guest に降格すると自身の権限が即時に落ちるため、
-- 単純な 2 回 UPDATE では 2 回目が RLS で拒否される。1 トランザクション
-- で実施する必要がある。
CREATE OR REPLACE FUNCTION public.transfer_team_ownership(
  p_team_id uuid,
  p_new_owner_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_role FROM public.team_members
  WHERE team_id = p_team_id AND user_id = v_user_id;

  IF v_role IS DISTINCT FROM 'host' THEN
    RAISE EXCEPTION 'host privilege required' USING ERRCODE = '42501';
  END IF;

  -- 新オーナーが当該チームのメンバーであることを確認
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND user_id = p_new_owner_id
  ) THEN
    RAISE EXCEPTION 'new owner is not a team member' USING ERRCODE = '22023';
  END IF;

  UPDATE public.team_members
  SET role = 'host'
  WHERE team_id = p_team_id AND user_id = p_new_owner_id;

  UPDATE public.team_members
  SET role = 'guest'
  WHERE team_id = p_team_id AND user_id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_team_ownership(uuid, uuid) TO authenticated;

-- ----- (4) public.users 行存在保証 -----
-- handle_new_user トリガー (011) の安全網。auth.users から自分の row を
-- 取り、public.users に upsert する。
CREATE OR REPLACE FUNCTION public.ensure_public_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_meta jsonb;
  v_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT email, raw_user_meta_data INTO v_email, v_meta
  FROM auth.users WHERE id = v_user_id;

  IF v_email IS NULL THEN
    RETURN;
  END IF;

  v_name := COALESCE(
    v_meta->>'full_name',
    v_meta->>'name',
    split_part(v_email, '@', 1),
    'ユーザー'
  );

  INSERT INTO public.users (id, name, email)
  VALUES (v_user_id, v_name, v_email)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_public_user() TO authenticated;

-- ============================================
-- ロールバック手順（必要時に手動実行）
-- ============================================
-- 以下を個別実行すると本マイグレーション適用前の状態にほぼ戻せる:
--
-- DROP POLICY IF EXISTS "users_select" ON public.users;
-- CREATE POLICY "users_select_own" ON public.users
--   FOR SELECT USING (auth.uid() = id);
--
-- 各ポリシーを 002 / 005 / 009 / 010 の定義に再 CREATE
-- DROP FUNCTION public.{create_team, accept_invite, transfer_team_ownership,
--                       ensure_public_user, get_my_team_ids, is_team_member,
--                       is_team_host, is_team_owner, is_teammate,
--                       can_view_schedule, get_my_team_role}(...);
