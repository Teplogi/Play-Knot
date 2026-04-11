-- ============================================
-- 10. ホスト権限制（チーム新規作成の制限）
-- ============================================
--
-- 背景:
--   誰でもチーム新規作成 → 自動 host になれてしまうと、
--   guest が捨てチームを作って NGリスト機能の存在を発見できてしまう。
--   NGリストはホストのみに見せたい機能なので「機能の存在自体」を
--   guest に隠したい。
--
-- 仕様:
--   users.can_create_team フラグを追加し、true のユーザのみが
--   teams への INSERT を許可される。デフォルトは false。
--   信頼できるホストには Supabase ダッシュボードから手動で
--   true をセットする運用。

-- 1. users テーブルに can_create_team 列を追加
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS can_create_team BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. teams_insert ポリシーを差し替え
--    旧: 認証済みなら誰でも作成可
--    新: can_create_team = true のユーザのみ作成可
DROP POLICY IF EXISTS "teams_insert" ON public.teams;

CREATE POLICY "teams_insert" ON public.teams
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND can_create_team = TRUE
    )
  );

-- 3. 既存のホストには can_create_team を true にしておく
--    （仕様変更前にチームを作っていた人が今後も作成できるよう
--      最低限の互換性を持たせる）
UPDATE public.users
SET can_create_team = TRUE
WHERE id IN (
  SELECT DISTINCT user_id FROM public.team_members WHERE role = 'host'
);
