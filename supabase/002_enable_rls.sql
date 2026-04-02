-- ============================================
-- 2. RLS（Row Level Security）設定
-- ============================================

-- RLSを有効化
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ng_pairs ENABLE ROW LEVEL SECURITY;

-- ----- usersポリシー -----
-- 自分のデータは自分だけ参照・更新可
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ----- teamsポリシー -----
-- 所属チームのみ参照可
CREATE POLICY "teams_select" ON public.teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );
-- チーム作成は認証済みユーザーなら誰でも可
CREATE POLICY "teams_insert" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- チーム更新・削除はホストのみ
CREATE POLICY "teams_host_write" ON public.teams
  FOR UPDATE USING (
    id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'host'
    )
  );
CREATE POLICY "teams_host_delete" ON public.teams
  FOR DELETE USING (
    id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'host'
    )
  );

-- ----- team_membersポリシー -----
-- 同じチームのメンバーは参照可
CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );
-- ホストのみ追加・編集・削除可
CREATE POLICY "team_members_host_insert" ON public.team_members
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'host'
    )
  );
CREATE POLICY "team_members_host_update" ON public.team_members
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'host'
    )
  );
CREATE POLICY "team_members_host_delete" ON public.team_members
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'host'
    )
  );

-- ----- schedulesポリシー -----
-- 同じチームのメンバーは参照可
CREATE POLICY "schedules_select" ON public.schedules
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );
-- ホストのみ作成・編集・削除可
CREATE POLICY "schedules_host_insert" ON public.schedules
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'host'
    )
  );
CREATE POLICY "schedules_host_update" ON public.schedules
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'host'
    )
  );
CREATE POLICY "schedules_host_delete" ON public.schedules
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'host'
    )
  );

-- ----- attendancesポリシー -----
-- 同じチームのメンバーは全員の出欠参照可
CREATE POLICY "attendances_select" ON public.attendances
  FOR SELECT USING (
    schedule_id IN (
      SELECT s.id FROM public.schedules s
      JOIN public.team_members tm ON tm.team_id = s.team_id
      WHERE tm.user_id = auth.uid()
    )
  );
-- 自分の出欠は自分で登録・更新可
CREATE POLICY "attendances_self_insert" ON public.attendances
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "attendances_self_update" ON public.attendances
  FOR UPDATE USING (user_id = auth.uid());

-- ----- ng_pairsポリシー -----
-- ホストのみ参照・操作可（ゲストには完全非表示）
CREATE POLICY "ng_pairs_host_select" ON public.ng_pairs
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'host'
    )
  );
CREATE POLICY "ng_pairs_host_insert" ON public.ng_pairs
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'host'
    )
  );
CREATE POLICY "ng_pairs_host_delete" ON public.ng_pairs
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'host'
    )
  );
