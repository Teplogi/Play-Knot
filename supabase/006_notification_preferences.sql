-- ============================================
-- 6. 通知設定（ユーザーごと）
-- ============================================

CREATE TABLE public.notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  schedule_created BOOLEAN NOT NULL DEFAULT TRUE,
  schedule_changed BOOLEAN NOT NULL DEFAULT TRUE,
  reminder BOOLEAN NOT NULL DEFAULT TRUE,
  deadline BOOLEAN NOT NULL DEFAULT TRUE,
  reopened BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, team_id)
);

-- RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_select_own" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notification_preferences_insert_own" ON public.notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_preferences_update_own" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);
