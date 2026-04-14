import { format } from "date-fns";
import { ja } from "date-fns/locale";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function formatDateTime(iso: string) {
  return format(new Date(iso), "M月d日(E) HH:mm", { locale: ja });
}

type Cell = { label: string; value: string };

function layout({
  accent,
  heading,
  lead,
  cells,
  ctaLabel,
  ctaUrl,
}: {
  accent: string;
  heading: string;
  lead: string;
  cells: Cell[];
  ctaLabel: string;
  ctaUrl: string;
}) {
  const rows = cells
    .map(
      (c) => `
      <tr>
        <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e5e5; width: 80px; color: #6b7280;">${c.label}</td>
        <td style="padding: 8px 12px; border: 1px solid #e5e5e5;">${c.value}</td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <div style="border: 1px solid #e5e5e5; border-radius: 12px; padding: 24px;">
    <h2 style="font-size: 16px; margin: 0 0 16px; color: ${accent};">${heading}</h2>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6;">${lead}</p>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px;">
      ${rows}
    </table>
    <a href="${ctaUrl}" style="display: inline-block; padding: 10px 20px; background: #1a1a1a; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px;">${ctaLabel}</a>
  </div>
  <p style="font-size: 12px; color: #9ca3af; margin-top: 16px; text-align: center;">
    このメールは Play Knot から自動送信されています
  </p>
</body>
</html>`.trim();
}

type BaseParams = {
  teamName: string;
  teamId: string;
  scheduleId: string;
  scheduleDate: string;
  location: string;
};

// キャンセル通知（既存・維持）
export function cancelNotificationTemplate(
  params: BaseParams & { memberName: string; comment: string | null }
) {
  const dateStr = formatDateTime(params.scheduleDate);
  const detailUrl = `${APP_URL}/teams/${params.teamId}/schedules/${params.scheduleId}`;
  const subject = `【${params.teamName}】${params.memberName}さんが${dateStr}の参加をキャンセルしました`;
  const cells: Cell[] = [
    { label: "チーム", value: params.teamName },
    { label: "日時", value: dateStr },
    { label: "場所", value: params.location },
  ];
  if (params.comment) cells.push({ label: "コメント", value: params.comment });

  const html = layout({
    accent: "#dc2626",
    heading: "参加キャンセルのお知らせ",
    lead: `<strong>${params.memberName}</strong>さんが練習への参加をキャンセルしました。`,
    cells,
    ctaLabel: "出欠を確認する",
    ctaUrl: detailUrl,
  });
  return { subject, html };
}

// 日程追加
export function scheduleCreatedTemplate(params: BaseParams & { note: string | null }) {
  const dateStr = formatDateTime(params.scheduleDate);
  const detailUrl = `${APP_URL}/teams/${params.teamId}/schedules/${params.scheduleId}`;
  const subject = `【${params.teamName}】新しい日程が追加されました (${dateStr})`;
  const cells: Cell[] = [
    { label: "チーム", value: params.teamName },
    { label: "日時", value: dateStr },
    { label: "場所", value: params.location },
  ];
  if (params.note) cells.push({ label: "メモ", value: params.note });

  const html = layout({
    accent: "#2563eb",
    heading: "新しい日程のお知らせ",
    lead: "出欠の登録をお願いします。",
    cells,
    ctaLabel: "出欠を回答する",
    ctaUrl: detailUrl,
  });
  return { subject, html };
}

// 日程変更・削除
export function scheduleChangedTemplate(
  params: BaseParams & { changeType: "updated" | "deleted" }
) {
  const dateStr = formatDateTime(params.scheduleDate);
  const detailUrl =
    params.changeType === "deleted"
      ? `${APP_URL}/teams/${params.teamId}`
      : `${APP_URL}/teams/${params.teamId}/schedules/${params.scheduleId}`;
  const action = params.changeType === "deleted" ? "削除" : "変更";
  const subject = `【${params.teamName}】日程が${action}されました (${dateStr})`;
  const cells: Cell[] = [
    { label: "チーム", value: params.teamName },
    { label: "日時", value: dateStr },
    { label: "場所", value: params.location },
  ];
  const html = layout({
    accent: "#d97706",
    heading: `日程${action}のお知らせ`,
    lead:
      params.changeType === "deleted"
        ? "以下の日程が削除されました。"
        : "以下の日程内容が変更されました。出欠回答を見直してください。",
    cells,
    ctaLabel: params.changeType === "deleted" ? "チームを開く" : "日程を確認する",
    ctaUrl: detailUrl,
  });
  return { subject, html };
}

// 未回答リマインド
export function reminderTemplate(params: BaseParams & { daysBefore: number }) {
  const dateStr = formatDateTime(params.scheduleDate);
  const detailUrl = `${APP_URL}/teams/${params.teamId}/schedules/${params.scheduleId}`;
  const subject = `【${params.teamName}】出欠が未回答です (${dateStr})`;
  const cells: Cell[] = [
    { label: "チーム", value: params.teamName },
    { label: "日時", value: dateStr },
    { label: "場所", value: params.location },
  ];
  const html = layout({
    accent: "#7c3aed",
    heading: "出欠未回答のリマインド",
    lead: `${params.daysBefore}日後の日程ですが、出欠がまだ登録されていません。回答をお願いします。`,
    cells,
    ctaLabel: "出欠を回答する",
    ctaUrl: detailUrl,
  });
  return { subject, html };
}

// 締め切り通知
export function deadlineTemplate(
  params: BaseParams & { deadline: string; daysBefore: number }
) {
  const dateStr = formatDateTime(params.scheduleDate);
  const deadlineStr = formatDateTime(params.deadline);
  const detailUrl = `${APP_URL}/teams/${params.teamId}/schedules/${params.scheduleId}`;
  const subject = `【${params.teamName}】出欠締切が近づいています (${dateStr})`;
  const cells: Cell[] = [
    { label: "チーム", value: params.teamName },
    { label: "日時", value: dateStr },
    { label: "場所", value: params.location },
    { label: "締切", value: deadlineStr },
  ];
  const html = layout({
    accent: "#dc2626",
    heading: "出欠締切のお知らせ",
    lead: `回答締切まで残り${params.daysBefore}日です。未回答の場合はお早めにどうぞ。`,
    cells,
    ctaLabel: "出欠を回答する",
    ctaUrl: detailUrl,
  });
  return { subject, html };
}

// 再募集通知
export function reopenedTemplate(params: BaseParams) {
  const dateStr = formatDateTime(params.scheduleDate);
  const detailUrl = `${APP_URL}/teams/${params.teamId}/schedules/${params.scheduleId}`;
  const subject = `【${params.teamName}】空きが出ました (${dateStr})`;
  const cells: Cell[] = [
    { label: "チーム", value: params.teamName },
    { label: "日時", value: dateStr },
    { label: "場所", value: params.location },
  ];
  const html = layout({
    accent: "#059669",
    heading: "再募集のお知らせ",
    lead: "キャンセルが出て空きができました。参加可能な方は回答をお願いします。",
    cells,
    ctaLabel: "参加表明する",
    ctaUrl: detailUrl,
  });
  return { subject, html };
}
