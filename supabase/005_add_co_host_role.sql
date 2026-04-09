-- ============================================
-- 5. co_host ロールの追加
-- ============================================

-- team_members の role CHECK 制約を更新
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_role_check;
ALTER TABLE public.team_members ADD CONSTRAINT team_members_role_check
  CHECK (role IN ('host', 'co_host', 'guest'));

-- co_host は1チームにつき最大3名まで
CREATE OR REPLACE FUNCTION check_co_host_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'co_host' THEN
    IF (
      SELECT COUNT(*) FROM public.team_members
      WHERE team_id = NEW.team_id AND role = 'co_host'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
    ) >= 3 THEN
      RAISE EXCEPTION '共同ホストは1チームにつき3名までです';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_co_host_limit
  BEFORE INSERT OR UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION check_co_host_limit();

-- ============================================
-- RLS ポリシー更新: co_host にもホスト同等の権限を付与
-- (チーム削除のみホスト限定のまま)
-- ============================================

-- ----- teams -----
-- チーム更新: co_host も可能に
DROP POLICY IF EXISTS "teams_host_write" ON public.teams;
CREATE POLICY "teams_host_write" ON public.teams
  FOR UPDATE USING (
    id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('host', 'co_host')
    )
  );
-- チーム削除: ホストのみ（変更なし、再作成で明示化）
DROP POLICY IF EXISTS "teams_host_delete" ON public.teams;
CREATE POLICY "teams_host_delete" ON public.teams
  FOR DELETE USING (
    id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'host'
    )
  );

-- ----- team_members -----
DROP POLICY IF EXISTS "team_members_host_insert" ON public.team_members;
CREATE POLICY "team_members_host_insert" ON public.team_members
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('host', 'co_host')
    )
  );
DROP POLICY IF EXISTS "team_members_host_update" ON public.team_members;
CREATE POLICY "team_members_host_update" ON public.team_members
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('host', 'co_host')
    )
  );
DROP POLICY IF EXISTS "team_members_host_delete" ON public.team_members;
CREATE POLICY "team_members_host_delete" ON public.team_members
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('host', 'co_host')
    )
  );

-- ----- schedules -----
DROP POLICY IF EXISTS "schedules_host_insert" ON public.schedules;
CREATE POLICY "schedules_host_insert" ON public.schedules
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('host', 'co_host')
    )
  );
DROP POLICY IF EXISTS "schedules_host_update" ON public.schedules;
CREATE POLICY "schedules_host_update" ON public.schedules
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('host', 'co_host')
    )
  );
DROP POLICY IF EXISTS "schedules_host_delete" ON public.schedules;
CREATE POLICY "schedules_host_delete" ON public.schedules
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('host', 'co_host')
    )
  );

-- ----- ng_pairs -----
DROP POLICY IF EXISTS "ng_pairs_host_select" ON public.ng_pairs;
CREATE POLICY "ng_pairs_host_select" ON public.ng_pairs
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('host', 'co_host')
    )
  );
DROP POLICY IF EXISTS "ng_pairs_host_insert" ON public.ng_pairs;
CREATE POLICY "ng_pairs_host_insert" ON public.ng_pairs
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('host', 'co_host')
    )
  );
DROP POLICY IF EXISTS "ng_pairs_host_delete" ON public.ng_pairs;
CREATE POLICY "ng_pairs_host_delete" ON public.ng_pairs
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('host', 'co_host')
    )
  );
