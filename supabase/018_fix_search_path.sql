-- ============================================
-- 18. check_co_host_limit の search_path 修正
-- ============================================
--
-- Supabase Security Advisor 指摘:
--   search_path 未設定の関数はスキーマ差し替え攻撃のリスクがある。
--   他の SECURITY DEFINER 関数は 012 で対応済みだが、この関数だけ漏れていた。

CREATE OR REPLACE FUNCTION check_co_host_limit()
RETURNS TRIGGER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.role = 'co_host' THEN
    IF (
      SELECT COUNT(*) FROM public.team_members
      WHERE team_id = NEW.team_id AND role = 'co_host'
        AND id IS DISTINCT FROM NEW.id
    ) >= 3 THEN
      RAISE EXCEPTION 'co_host_limit_reached';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
