-- ============================================
-- 9. チーム設定テーブル + スケジュール拡張
-- ============================================

-- チームごとの設定を保持するテーブル
CREATE TABLE IF NOT EXISTS public.team_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL UNIQUE,
  default_locations TEXT[] DEFAULT '{}',
  default_start_time TEXT DEFAULT '19:00',
  default_end_time TEXT DEFAULT '21:00',
  attendance_deadline_hours_before INT DEFAULT 1,
  default_divide_by TEXT DEFAULT 'team_count',
  default_divide_value INT DEFAULT 2,
  default_divide_method TEXT DEFAULT 'random',
  auto_select_attendees BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_settings_select" ON public.team_settings
  FOR SELECT USING (
    team_id IN (SELECT public.get_my_team_ids())
  );

CREATE POLICY "team_settings_upsert" ON public.team_settings
  FOR INSERT WITH CHECK (
    team_id IN (SELECT public.get_my_team_ids())
  );

CREATE POLICY "team_settings_update" ON public.team_settings
  FOR UPDATE USING (
    team_id IN (SELECT public.get_my_team_ids())
  );

-- スケジュールに終了時刻・回答締切を追加
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
