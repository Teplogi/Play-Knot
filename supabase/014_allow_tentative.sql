-- ============================================
-- 14. 「検討中」回答 (tentative) 対応
-- ============================================
--
-- 変更点:
--   1. team_settings に allow_tentative (BOOLEAN, default false) を追加。
--      ON のチームでのみ、検討中の新規回答を許可する。
--      OFF に戻しても既存の tentative レコードは保持（表示のみ）。
--   2. attendances.status の CHECK 制約を 'attend' / 'absent' / 'tentative' に拡張。
--
-- 集計での扱い（アプリ側で実装）:
--   - 定員・満員判定: tentative は含めない
--   - チーム分け: tentative は対象外
--   - 統計: 締切時点で tentative のままなら母数から除外。
--           実施日当日までに attend に変更された場合は通常どおりカウント。

ALTER TABLE public.team_settings
  ADD COLUMN IF NOT EXISTS allow_tentative BOOLEAN NOT NULL DEFAULT FALSE;

-- attendances.status の CHECK 制約を更新
DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.attendances'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.attendances DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

ALTER TABLE public.attendances
  ADD CONSTRAINT attendances_status_check
  CHECK (status IN ('attend', 'absent', 'tentative'));
