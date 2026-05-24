-- ============================================
-- 23. 確定したチーム分け結果 (saved_team_divisions)
-- ============================================
--
-- 背景:
--   開発初期に廃止していた「チーム分け結果を日程に紐づけて保存する」
--   機能を再導入する。日程当日にホストが現地で組んだチームを後から
--   見返したい、というユースケース。
--
-- 設計:
--   - 1 日程あたり 1 件の確定チーム分けを保持 (UNIQUE schedule_id)。
--     再保存は上書き (upsert)。シンプルさ重視で履歴 (バージョン) は
--     持たない。
--   - チーム構成は teams JSONB に
--       [[{ id, name, gender, isDummy }, ...], ...]
--     という Member[][] 形で保存する。team_members や team_guests へ
--     FK は張らず、保存時点でのスナップショットを丸ごと持つ。これに
--     より、後でメンバーが脱退したりゲストが削除されても、当日のチーム
--     編成はそのまま閲覧できる。
--   - method / divide_by / divide_value は再現用のメタデータ。
--   - team_id は RLS と削除カスケードのために重複保持する。schedule の
--     team_id と一致するかは API 層で担保する。
--   - 閲覧はチームメンバー全員 (is_team_member)、書き込みはホスト /
--     共同ホストのみ (is_team_host)。

CREATE TABLE public.saved_team_divisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  teams JSONB NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('random', 'gender_equal')),
  divide_by TEXT NOT NULL CHECK (divide_by IN ('team_count', 'members_per_team')),
  divide_value INTEGER NOT NULL CHECK (divide_value >= 1),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (schedule_id)
);

CREATE INDEX saved_team_divisions_team_id_idx ON public.saved_team_divisions(team_id);

-- updated_at の自動更新
CREATE OR REPLACE FUNCTION public.set_saved_team_divisions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER saved_team_divisions_set_updated_at
  BEFORE UPDATE ON public.saved_team_divisions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_saved_team_divisions_updated_at();

ALTER TABLE public.saved_team_divisions ENABLE ROW LEVEL SECURITY;

-- 閲覧: チームメンバー全員
CREATE POLICY "saved_team_divisions_member_select" ON public.saved_team_divisions
  FOR SELECT USING (public.is_team_member(team_id));

-- 書き込みはホスト/共同ホストのみ
CREATE POLICY "saved_team_divisions_host_insert" ON public.saved_team_divisions
  FOR INSERT WITH CHECK (public.is_team_host(team_id));

CREATE POLICY "saved_team_divisions_host_update" ON public.saved_team_divisions
  FOR UPDATE USING (public.is_team_host(team_id))
  WITH CHECK (public.is_team_host(team_id));

CREATE POLICY "saved_team_divisions_host_delete" ON public.saved_team_divisions
  FOR DELETE USING (public.is_team_host(team_id));

NOTIFY pgrst, 'reload schema';
