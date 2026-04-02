-- ============================================
-- 4. 招待トークンテーブル
-- ============================================

CREATE TABLE public.invite_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS有効化
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- ホストのみ作成・参照可
CREATE POLICY "invite_tokens_host_select" ON public.invite_tokens
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'host'
    )
  );

CREATE POLICY "invite_tokens_host_insert" ON public.invite_tokens
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'host'
    )
  );

-- トークン検証用：認証済みユーザーならトークン値で参照可
CREATE POLICY "invite_tokens_verify" ON public.invite_tokens
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- トークン使用済み更新：認証済みユーザーなら更新可
CREATE POLICY "invite_tokens_use" ON public.invite_tokens
  FOR UPDATE USING (auth.uid() IS NOT NULL);
