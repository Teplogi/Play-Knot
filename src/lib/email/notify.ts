import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "./resend";
import {
  scheduleCreatedTemplate,
  scheduleChangedTemplate,
  reopenedTemplate,
  cancelNotificationTemplate,
} from "./templates";

type PrefKey = "schedule_created" | "schedule_changed" | "reopened" | "cancellation";

type ScheduleSnapshot = {
  id: string;
  team_id: string;
  date: string;
  location: string;
  note: string | null;
};

type TeamSnapshot = { id: string; name: string };

type MemberRow = {
  user_id: string;
  role: string;
  users: { email: string; notification_email: string | null };
};

// 通知対象のメールアドレス一覧を取得する共通処理
// - notification_preferences で該当フラグが ON のメンバーのみ
//   (行未作成のユーザーはデフォルト ON とみなす)
// - notification_email が設定されていればそれを優先、NULL なら users.email
// - excludeUserId のメンバーは除外
// - hostsOnly=true でホスト/共同ホストに限定
async function getOptedInEmails(
  supabase: SupabaseClient,
  teamId: string,
  prefKey: PrefKey,
  options: { excludeUserId?: string; hostsOnly?: boolean } = {}
): Promise<string[]> {
  const memberQuery = supabase
    .from("team_members")
    .select("user_id, role, users!inner(email, notification_email)")
    .eq("team_id", teamId);
  if (options.hostsOnly) {
    memberQuery.in("role", ["host", "co_host"]);
  }
  const { data: members, error } = await memberQuery;
  if (error || !members) return [];

  const memberRows = members as unknown as MemberRow[];
  const userIds = memberRows.map((m) => m.user_id);
  if (userIds.length === 0) return [];

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select(`user_id, ${prefKey}`)
    .eq("team_id", teamId)
    .in("user_id", userIds);

  const prefMap = new Map<string, boolean>();
  for (const p of (prefs || []) as unknown as Array<Record<string, unknown>>) {
    prefMap.set(p.user_id as string, Boolean(p[prefKey]));
  }

  const emails: string[] = [];
  for (const row of memberRows) {
    if (options.excludeUserId && row.user_id === options.excludeUserId) continue;
    // 未設定ユーザーはデフォルト ON
    const enabled = prefMap.has(row.user_id) ? prefMap.get(row.user_id)! : true;
    if (!enabled) continue;
    const addr = row.users?.notification_email || row.users?.email;
    if (addr) emails.push(addr);
  }
  return emails;
}

// 1. 日程追加通知（作成者以外の全メンバーへ）
export async function notifyScheduleCreated(
  supabase: SupabaseClient,
  schedule: ScheduleSnapshot,
  team: TeamSnapshot,
  createdByUserId: string
): Promise<void> {
  const emails = await getOptedInEmails(supabase, team.id, "schedule_created", {
    excludeUserId: createdByUserId,
  });
  if (emails.length === 0) return;

  const { subject, html } = scheduleCreatedTemplate({
    teamName: team.name,
    teamId: team.id,
    scheduleId: schedule.id,
    scheduleDate: schedule.date,
    location: schedule.location,
    note: schedule.note,
  });
  await sendEmail({ to: emails, subject, html });
}

// 2. 日程変更・削除通知
export async function notifyScheduleChanged(
  supabase: SupabaseClient,
  schedule: ScheduleSnapshot,
  team: TeamSnapshot,
  changeType: "updated" | "deleted",
  actorUserId: string
): Promise<void> {
  const emails = await getOptedInEmails(supabase, team.id, "schedule_changed", {
    excludeUserId: actorUserId,
  });
  if (emails.length === 0) return;

  const { subject, html } = scheduleChangedTemplate({
    teamName: team.name,
    teamId: team.id,
    scheduleId: schedule.id,
    scheduleDate: schedule.date,
    location: schedule.location,
    changeType,
  });
  await sendEmail({ to: emails, subject, html });
}

// 3. 再募集通知（キャンセルで空きが出たとき）
//    既に「参加」と回答済みのメンバーは対象外にする
export async function notifyReopened(
  supabase: SupabaseClient,
  schedule: ScheduleSnapshot,
  team: TeamSnapshot,
  cancellerUserId: string
): Promise<void> {
  const { data: attendings } = await supabase
    .from("attendances")
    .select("user_id")
    .eq("schedule_id", schedule.id)
    .eq("status", "attend");
  const attendingIds = new Set((attendings || []).map((a) => a.user_id));

  const candidateEmails = await getOptedInEmails(supabase, team.id, "reopened", {
    excludeUserId: cancellerUserId,
  });
  if (candidateEmails.length === 0) return;

  // attendance 参加済みユーザーのアドレスを除外したいので user 単位で再マッチ
  const { data: members } = await supabase
    .from("team_members")
    .select("user_id, users!inner(email, notification_email)")
    .eq("team_id", team.id);
  const memberRows = (members || []) as unknown as MemberRow[];
  const excludedAddrs = new Set(
    memberRows
      .filter((m) => attendingIds.has(m.user_id))
      .map((m) => m.users?.notification_email || m.users?.email)
      .filter(Boolean)
  );
  const emails = candidateEmails.filter((e) => !excludedAddrs.has(e));
  if (emails.length === 0) return;

  const { subject, html } = reopenedTemplate({
    teamName: team.name,
    teamId: team.id,
    scheduleId: schedule.id,
    scheduleDate: schedule.date,
    location: schedule.location,
  });
  await sendEmail({ to: emails, subject, html });
}

// 4. キャンセル通知（ホスト/共同ホストへ。cancellation プリファレンス尊重）
export async function notifyCancellation(
  supabase: SupabaseClient,
  schedule: ScheduleSnapshot,
  team: TeamSnapshot,
  memberName: string,
  comment: string | null,
  cancellerUserId: string
): Promise<void> {
  const emails = await getOptedInEmails(supabase, team.id, "cancellation", {
    hostsOnly: true,
    excludeUserId: cancellerUserId,
  });
  if (emails.length === 0) return;

  const { subject, html } = cancelNotificationTemplate({
    teamName: team.name,
    teamId: team.id,
    scheduleId: schedule.id,
    scheduleDate: schedule.date,
    location: schedule.location,
    memberName,
    comment,
  });
  await sendEmail({ to: emails, subject, html });
}
