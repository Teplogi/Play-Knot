-- ============================================
-- 16. 通知設定のチームメンバー間 SELECT を許可
-- ============================================
--
-- 背景:
--   メール通知送信時、他メンバーの通知設定 (ON/OFF) を参照する必要がある。
--   既存の RLS は「自分の設定だけ読める」だが、これでは別のユーザーの
--   リクエスト内で通知設定を照会できない。
--   (例: メンバーがキャンセル → ホストの cancellation 設定を確認 → 送信判定)
--
--   通知設定は ON/OFF フラグと日数のみで機密情報を含まないため、
--   同一チームのメンバーには SELECT を許可する。
--
-- INSERT/UPDATE は引き続き自分の行のみに制限 (変更なし)。

CREATE POLICY "notification_preferences_select_team_member"
  ON public.notification_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = notification_preferences.team_id
        AND tm.user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
