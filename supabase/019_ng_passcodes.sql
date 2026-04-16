-- ============================================
-- 19. NGリスト パスコード管理テーブル
-- ============================================
--
-- NGリストへのアクセスを 4 桁 PIN で保護する。
-- PIN はホスト / 共同ホストごと × チームごとに個人管理。
--
-- hashed_pin: SHA-256 ハッシュ (サーバー側で生成)
-- reset_token: メール経由の PIN リセット用トークン
-- reset_expires_at: トークン有効期限 (30 分)

CREATE TABLE public.ng_passcodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  hashed_pin TEXT NOT NULL,
  reset_token TEXT,
  reset_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, team_id)
);

ALTER TABLE public.ng_passcodes ENABLE ROW LEVEL SECURITY;

-- 自分の行のみ操作可能
CREATE POLICY "ng_passcodes_select_own" ON public.ng_passcodes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "ng_passcodes_insert_own" ON public.ng_passcodes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ng_passcodes_update_own" ON public.ng_passcodes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "ng_passcodes_delete_own" ON public.ng_passcodes
  FOR DELETE USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
