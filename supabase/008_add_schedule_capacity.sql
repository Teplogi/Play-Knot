-- ============================================
-- 8. スケジュールに定員カラム追加
-- ============================================

ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS capacity INT DEFAULT NULL;
