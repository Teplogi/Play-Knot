-- ============================================
-- 22. NGペア / 必ずペア に助っ人 (team_guests) を含められるようにする
-- ============================================
--
-- 背景:
--   従来 ng_pairs / must_pairs.user_id_a / user_id_b は public.users(id) への
--   FK であったため、ホストが手動で追加した助っ人 (team_guests) を
--   組み合わせ条件に登録することができなかった。
--
-- 設計:
--   - user_id_a / user_id_b の参照先を public.users から外し、
--     「public.users.id か public.team_guests.id のどちらか」という
--     ゆるい識別子として扱う。整合性は API 層 (チーム所属チェック) で担保する。
--   - 既存 CASCADE 削除の挙動を維持するため、users / team_guests に
--     BEFORE DELETE トリガーを追加し、対象 ID を含むペアを片付ける。
--   - 列名 (user_id_a / user_id_b) は互換性維持のため変更しない。

-- FK 撤去
ALTER TABLE public.ng_pairs
  DROP CONSTRAINT IF EXISTS ng_pairs_user_id_a_fkey;
ALTER TABLE public.ng_pairs
  DROP CONSTRAINT IF EXISTS ng_pairs_user_id_b_fkey;

ALTER TABLE public.must_pairs
  DROP CONSTRAINT IF EXISTS must_pairs_user_id_a_fkey;
ALTER TABLE public.must_pairs
  DROP CONSTRAINT IF EXISTS must_pairs_user_id_b_fkey;

-- 削除時の片付け関数 (users / team_guests 共通)
CREATE OR REPLACE FUNCTION public.cleanup_pairs_on_participant_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.ng_pairs
    WHERE user_id_a = OLD.id OR user_id_b = OLD.id;
  DELETE FROM public.must_pairs
    WHERE user_id_a = OLD.id OR user_id_b = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS cleanup_pairs_on_user_delete ON public.users;
CREATE TRIGGER cleanup_pairs_on_user_delete
  BEFORE DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_pairs_on_participant_delete();

DROP TRIGGER IF EXISTS cleanup_pairs_on_team_guest_delete ON public.team_guests;
CREATE TRIGGER cleanup_pairs_on_team_guest_delete
  BEFORE DELETE ON public.team_guests
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_pairs_on_participant_delete();

NOTIFY pgrst, 'reload schema';
