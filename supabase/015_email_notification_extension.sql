-- ============================================
-- 15. メール通知機能の拡張
-- ============================================
--
-- 変更点:
--   1. notification_preferences に以下を追加:
--      - reminder_days_before  INT    未回答リマインドを何日前に送るか (0/1/3/7)
--      - deadline_days_before  INT    締切通知を何日前に送るか (0/1/3/7)
--      - cancellation          BOOL   キャンセル通知を受け取るか (ホスト向け)
--      値 0 は「通知しない」を意味する (ON/OFF の基本フラグと併用)。
--   2. users に notification_email TEXT を追加 (NULL なら登録 Gmail を使用)。
--
-- 既存データの挙動:
--   - 既存行は DEFAULT でバックフィルされるため、現在の ON/OFF 挙動は変わらない。
--   - reminder: 3日前、deadline: 1日前がデフォルト (A案)。
--   - cancellation: ホストにはデフォルト ON。

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS reminder_days_before INT NOT NULL DEFAULT 3
    CHECK (reminder_days_before IN (0, 1, 3, 7)),
  ADD COLUMN IF NOT EXISTS deadline_days_before INT NOT NULL DEFAULT 1
    CHECK (deadline_days_before IN (0, 1, 3, 7)),
  ADD COLUMN IF NOT EXISTS cancellation BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notification_email TEXT;

-- 簡易バリデーション: @ を含むメール形式らしい文字列のみ許可 (NULL は OK)
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_notification_email_format;
ALTER TABLE public.users
  ADD CONSTRAINT users_notification_email_format
  CHECK (notification_email IS NULL OR notification_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

NOTIFY pgrst, 'reload schema';
