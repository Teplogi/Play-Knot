-- ============================================
-- 24. 招待リンクをマルチユース化
-- ============================================
--
-- 背景:
--   012 の accept_invite は招待トークンを「1 回限り」で扱っていた。
--   最初に参加した人で used_at / used_by が記録され、2 人目以降が
--   同じリンクを使うと「invite token already used」で弾かれる。
--   auth/callback はこの例外を握りつぶして /teams にリダイレクトするため、
--   後から来た人には「まだチームに参加していません」が表示されていた。
--
--   ホストは 1 本の招待リンクをチーム全員に共有するのが自然なため、
--   有効期限内であれば何人でも参加できる「マルチユース」に変更する。
--
-- 対応:
--   A. accept_invite を再定義（有効期限のみで判定 / 冪等 / used_at は触らない）
--   B. 既に used 扱いになっている有効期限内トークンを「有効」に戻す
--   C. 招待情報取得用の SECURITY DEFINER RPC を追加
--      （未ログインの招待先でもチーム名・有効性を表示できるよう anon にも付与）

-- ============================================
-- A. accept_invite 再定義（マルチユース）
-- ============================================
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

  -- 既メンバーなら冪等に team_id を返す
  SELECT id INTO v_existing
  FROM public.team_members
  WHERE team_id = v_token.team_id AND user_id = v_user_id;
  IF v_existing IS NOT NULL THEN
    RETURN v_token.team_id;
  END IF;

  -- 有効期限内であれば誰でも参加可能（マルチユース）。
  -- used_at / used_by は意図的に更新しない（リンクを「有効」のまま保ち、
  -- ホスト設定画面でも継続して URL コピー可能にするため）。
  -- 同時実行や二重送信に備えて ON CONFLICT DO NOTHING。
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_token.team_id, v_user_id, 'guest')
  ON CONFLICT (team_id, user_id) DO NOTHING;

  RETURN v_token.team_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite(uuid) TO authenticated;

-- ============================================
-- B. 既存の「使用済み」トークンを有効に戻す
-- ============================================
-- 旧 single-use 仕様で used になり、現在参加できなくなっている
-- 有効期限内のリンクを再度有効化する（既に参加済みの人には影響なし）。
UPDATE public.invite_tokens
SET used_at = NULL, used_by = NULL
WHERE used_at IS NOT NULL
  AND expires_at > now();

-- ============================================
-- C. 招待情報取得 RPC
-- ============================================
-- 招待先ユーザはホストではないため invite_tokens を直接 SELECT できない
-- (012 で host 限定に変更済み)。未ログイン状態の /login?token=... でも
-- チーム名・有効性を表示できるよう SECURITY DEFINER で公開する。
-- token (UUID) を知っていること自体が招待の証明なので anon にも付与する。
CREATE OR REPLACE FUNCTION public.get_invite_info(p_token uuid)
RETURNS TABLE(team_id uuid, team_name text, expires_at timestamptz, is_valid boolean)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT it.team_id, t.name, it.expires_at, (it.expires_at > now()) AS is_valid
  FROM public.invite_tokens it
  JOIN public.teams t ON t.id = it.team_id
  WHERE it.token = p_token;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_info(uuid) TO anon, authenticated;
