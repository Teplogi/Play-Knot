-- ============================================
-- 21. 必ず同じチームになるペア (must_pairs)
-- ============================================
--
-- 設計:
--   - ng_pairs と並列の概念。同一ペアの重複は (user_id_a, user_id_b) で
--     UNIQUE。CHECK (user_id_a < user_id_b) で正規化し、(B,A) と (A,B) の
--     両方が登録されることを防ぐ。
--   - 「厳密にペア単位 (chain は組まない)」要件は API 層で
--     「同一ユーザは must_pairs に最大 1 件」を担保する。
--   - ng_pairs と同じペアが must_pairs に登録されることは API 層で禁止。
--   - host / co_host のみ操作可能。is_team_host SECURITY DEFINER ヘルパー
--     を再利用する。

CREATE TABLE public.must_pairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id_a UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  user_id_b UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CHECK (user_id_a < user_id_b),
  UNIQUE (team_id, user_id_a, user_id_b)
);

CREATE INDEX must_pairs_team_id_idx ON public.must_pairs(team_id);

ALTER TABLE public.must_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "must_pairs_host_select" ON public.must_pairs
  FOR SELECT USING (public.is_team_host(team_id));

CREATE POLICY "must_pairs_host_insert" ON public.must_pairs
  FOR INSERT WITH CHECK (public.is_team_host(team_id));

CREATE POLICY "must_pairs_host_delete" ON public.must_pairs
  FOR DELETE USING (public.is_team_host(team_id));

NOTIFY pgrst, 'reload schema';
