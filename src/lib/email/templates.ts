import { format } from "date-fns";
import { ja } from "date-fns/locale";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

type CancelNotificationParams = {
  teamName: string;
  memberName: string;
  scheduleDate: string;
  location: string;
  comment: string | null;
  teamId: string;
  scheduleId: string;
};

// キャンセル通知メールテンプレート
export function cancelNotificationTemplate(params: CancelNotificationParams) {
  const dateStr = format(new Date(params.scheduleDate), "M月d日(E) HH:mm", { locale: ja });
  const detailUrl = `${APP_URL}/teams/${params.teamId}/schedules/${params.scheduleId}`;

  const subject = `【${params.teamName}】${params.memberName}さんが${dateStr}の参加をキャンセルしました`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <div style="border: 1px solid #e5e5e5; border-radius: 12px; padding: 24px;">
    <h2 style="font-size: 16px; margin: 0 0 16px; color: #dc2626;">参加キャンセルのお知らせ</h2>

    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6;">
      <strong>${params.memberName}</strong>さんが練習への参加をキャンセルしました。
    </p>

    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px;">
      <tr>
        <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e5e5; width: 80px; color: #6b7280;">チーム</td>
        <td style="padding: 8px 12px; border: 1px solid #e5e5e5;">${params.teamName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e5e5; color: #6b7280;">日時</td>
        <td style="padding: 8px 12px; border: 1px solid #e5e5e5;">${dateStr}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e5e5; color: #6b7280;">場所</td>
        <td style="padding: 8px 12px; border: 1px solid #e5e5e5;">${params.location}</td>
      </tr>
      ${params.comment ? `
      <tr>
        <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e5e5; color: #6b7280;">コメント</td>
        <td style="padding: 8px 12px; border: 1px solid #e5e5e5;">${params.comment}</td>
      </tr>` : ""}
    </table>

    <a href="${detailUrl}" style="display: inline-block; padding: 10px 20px; background: #1a1a1a; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px;">出欠を確認する</a>
  </div>

  <p style="font-size: 12px; color: #9ca3af; margin-top: 16px; text-align: center;">
    このメールはスポーツチーム管理アプリから自動送信されています
  </p>
</body>
</html>`.trim();

  return { subject, html };
}
