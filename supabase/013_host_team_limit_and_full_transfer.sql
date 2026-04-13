-- ============================================
-- 13. ホスト兼任上限 2チーム + 完全譲渡
-- ============================================
--
-- 変更点:
--   1. create_team に「1ユーザがホストになれるのは最大2チームまで」
--      の上限チェックを追加。
--   2. transfer_team_ownership を「完全譲渡」に変更。
--      - 新オーナーに can_create_team を付与（信頼の保証）
--      - 旧オーナーが他にホスト役割を持っていなければ can_create_team を剥奪
--      - 新オーナーが別のチームで既に 2 チームのホストを兼任している
--        場合は譲渡を拒否（3 チーム以上のホスト化を防ぐ）
--
-- エラーシグナリング:
--   アプリ側が分岐できるよう、以下の固定文字列を message にして
--   ERRCODE = 'P0001' で RAISE する。
--     - 'host_team_limit_reached'        (create_team で本人が上限)
--     - 'new_owner_host_limit_reached'   (transfer で譲渡先が上限)

-- ----- create_team 更新 -----
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
  v_host_count int;
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

  -- 1ユーザは最大 2 チームのホストまで
  SELECT COUNT(*) INTO v_host_count
  FROM public.team_members
  WHERE user_id = v_user_id AND role = 'host';

  IF v_host_count >= 2 THEN
    RAISE EXCEPTION 'host_team_limit_reached' USING ERRCODE = 'P0001';
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

-- ----- transfer_team_ownership 更新（完全譲渡） -----
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
  v_new_owner_host_count int;
  v_old_still_host boolean;
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

  -- 新オーナーが他チームで既に 2 チームのホストを兼任していないか
  -- (この後 host にするので、当該チームを除外したカウントで判定)
  SELECT COUNT(*) INTO v_new_owner_host_count
  FROM public.team_members
  WHERE user_id = p_new_owner_id
    AND role = 'host'
    AND team_id <> p_team_id;

  IF v_new_owner_host_count >= 2 THEN
    RAISE EXCEPTION 'new_owner_host_limit_reached' USING ERRCODE = 'P0001';
  END IF;

  -- 新オーナーを host に昇格
  UPDATE public.team_members
  SET role = 'host'
  WHERE team_id = p_team_id AND user_id = p_new_owner_id;

  -- 新オーナーに作成権限を付与（完全譲渡）
  UPDATE public.users
  SET can_create_team = TRUE
  WHERE id = p_new_owner_id;

  -- 旧オーナーを guest に降格
  UPDATE public.team_members
  SET role = 'guest'
  WHERE team_id = p_team_id AND user_id = v_user_id;

  -- 旧オーナーが他にホスト役割を持っていなければ作成権限を剥奪
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = v_user_id AND role = 'host'
  ) INTO v_old_still_host;

  IF NOT v_old_still_host THEN
    UPDATE public.users
    SET can_create_team = FALSE
    WHERE id = v_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_team_ownership(uuid, uuid) TO authenticated;
