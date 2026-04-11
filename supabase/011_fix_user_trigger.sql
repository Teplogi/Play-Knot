-- ============================================
-- 11. 新規ユーザ自動登録トリガーの修正 + 取りこぼしバックフィル
-- ============================================
--
-- 背景:
--   003_auth_trigger.sql のトリガーが auth.users → public.users の
--   自動 INSERT を担っていたが、サイレントに失敗してしまうケースが
--   あり、招待からログインしたユーザが auth.users にだけ存在し
--   public.users には存在しない状態が発生していた。
--
--   public.users 行が無いと、team_members.user_id の FK 制約で
--   招待 → チーム参加の INSERT が失敗するため、招待フロー破綻の
--   一因になっていた。
--
-- 修正内容:
--   1. トリガー関数を再作成
--      - SECURITY DEFINER + SET search_path = public で安全に
--      - name の NULL を多段 COALESCE で防ぐ
--      - ON CONFLICT (id) DO NOTHING で重複に強くする
--      - EXCEPTION WHEN OTHERS で signup 自体は止めない（fail-safe）
--   2. 既存の取りこぼし（auth.users にあるが public.users に無い行）
--      をバックフィル

-- 1. トリガー関数の差し替え
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      'ユーザー'
    ),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- public.users 作成に失敗しても auth signup は止めない。
  -- ログに残してアプリ側のフォールバック (auth/callback) に任せる。
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 2. トリガーを再作成（既存があれば置き換え）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. 既存の取りこぼしバックフィル
--    auth.users にいるが public.users にいないユーザを自動補完
INSERT INTO public.users (id, name, email)
SELECT
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1),
    'ユーザー'
  ),
  au.email
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
  AND au.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;
