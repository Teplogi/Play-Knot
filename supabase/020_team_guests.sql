-- ============================================
-- 20. 助っ人 (ゲスト) を永続化
-- ============================================
--
-- 背景:
--   従来、チーム分け画面の「+助っ人追加」はクライアント useState のみで
--   保持されていたため、別画面に遷移すると消えていた。
--
-- 設計:
--   A. team_guests
--      - チーム単位の助っ人プール。auth ユーザを持たない。
--      - host / co_host のみ追加・編集・削除。同じチームのメンバーは閲覧可。
--   B. schedule_guests
--      - 日程ごとに招集されたゲストを保持。出欠リストに合算する。
--      - host / co_host のみ招集・解除。同じチームのメンバーは閲覧可。
--
--   既存 SECURITY DEFINER ヘルパー (is_team_member / is_team_host) を再利用し
--   再帰参照を回避する。

-- ============================================
-- A. team_guests
-- ============================================
CREATE TABLE public.team_guests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  gender TEXT CHECK (gender IN ('男', '女', '未設定')) NOT NULL DEFAULT '未設定',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX team_guests_team_id_idx ON public.team_guests(team_id);

ALTER TABLE public.team_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_guests_select" ON public.team_guests
  FOR SELECT USING (public.is_team_member(team_id));

CREATE POLICY "team_guests_host_insert" ON public.team_guests
  FOR INSERT WITH CHECK (public.is_team_host(team_id));

CREATE POLICY "team_guests_host_update" ON public.team_guests
  FOR UPDATE USING (public.is_team_host(team_id));

CREATE POLICY "team_guests_host_delete" ON public.team_guests
  FOR DELETE USING (public.is_team_host(team_id));

-- ============================================
-- B. schedule_guests
-- ============================================
CREATE TABLE public.schedule_guests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE NOT NULL,
  guest_id UUID REFERENCES public.team_guests(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(schedule_id, guest_id)
);

CREATE INDEX schedule_guests_schedule_id_idx ON public.schedule_guests(schedule_id);
CREATE INDEX schedule_guests_guest_id_idx ON public.schedule_guests(guest_id);

ALTER TABLE public.schedule_guests ENABLE ROW LEVEL SECURITY;

-- 同じチームのメンバーは閲覧可（schedule から team_id を辿って判定）
CREATE POLICY "schedule_guests_select" ON public.schedule_guests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.schedules s
      WHERE s.id = schedule_guests.schedule_id
        AND public.is_team_member(s.team_id)
    )
  );

CREATE POLICY "schedule_guests_host_insert" ON public.schedule_guests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schedules s
      WHERE s.id = schedule_guests.schedule_id
        AND public.is_team_host(s.team_id)
    )
  );

CREATE POLICY "schedule_guests_host_delete" ON public.schedule_guests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.schedules s
      WHERE s.id = schedule_guests.schedule_id
        AND public.is_team_host(s.team_id)
    )
  );

-- ============================================
-- updated_at 自動更新トリガー (team_guests)
-- ============================================
CREATE OR REPLACE FUNCTION public.touch_team_guests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER team_guests_set_updated_at
  BEFORE UPDATE ON public.team_guests
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_team_guests_updated_at();

NOTIFY pgrst, 'reload schema';
