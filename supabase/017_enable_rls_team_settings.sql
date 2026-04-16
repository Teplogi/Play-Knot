-- ============================================
-- 17. team_settings の RLS 有効化 (修正)
-- ============================================
--
-- Supabase Security Advisor の指摘:
--   RLS ポリシーは定義されているが RLS 自体が無効のため、
--   ポリシーが適用されず全ユーザーが読み書き可能な状態だった。
--
-- 009 で ENABLE ROW LEVEL SECURITY を実行済みのはずだが、
-- 実 DB では無効になっていたため再度有効化する。冪等操作のため安全。

ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
