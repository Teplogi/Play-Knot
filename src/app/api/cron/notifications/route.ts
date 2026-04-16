import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { reminderTemplate, deadlineTemplate } from "@/lib/email/templates";

// Vercel Cron: 毎朝 0:00 UTC (= JST 9:00) に実行
// - 未回答リマインド: 試合日の N 日前 (ユーザーごとの reminder_days_before)
// - 締切通知: 締切日の N 日前 (ユーザーごとの deadline_days_before)
export async function GET(request: Request) {
  // Vercel Cron の認証
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // JST の「今日」を算出 (cron は 0:00 UTC = 9:00 JST に実行される)
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstDate = new Date(now.getTime() + jstOffset);
  const todayStr = jstDate.toISOString().slice(0, 10); // "YYYY-MM-DD"

  const results = { reminders: 0, deadlines: 0, errors: [] as string[] };

  try {
    await sendReminders(supabase, todayStr, results);
  } catch (err) {
    results.errors.push(`reminders: ${String(err)}`);
  }

  try {
    await sendDeadlineNotifications(supabase, todayStr, results);
  } catch (err) {
    results.errors.push(`deadlines: ${String(err)}`);
  }

  console.log("Cron notifications result:", results);
  return NextResponse.json(results);
}

type CronResults = { reminders: number; deadlines: number; errors: string[] };

// 未回答リマインド送信
// 対象: reminder=true & reminder_days_before > 0 & 試合日が N 日後 & 未回答
async function sendReminders(
  supabase: ReturnType<typeof createAdminClient>,
  todayStr: string,
  results: CronResults
) {
  // 有効なリマインド日数の選択肢ごとに処理
  for (const daysBefore of [1, 3, 7]) {
    const targetDate = addDays(todayStr, daysBefore);

    // targetDate に開催される日程を取得
    const { data: schedules, error: schedErr } = await supabase
      .from("schedules")
      .select("id, team_id, date, location, note, teams(id, name)")
      .gte("date", `${targetDate}T00:00:00+09:00`)
      .lt("date", `${targetDate}T23:59:59+09:00`);

    if (schedErr || !schedules || schedules.length === 0) continue;

    for (const schedule of schedules) {
      const team = schedule.teams as unknown as { id: string; name: string } | null;
      if (!team) continue;

      // この日程に未回答のメンバーを取得
      const { data: unanswered } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", schedule.team_id);
      if (!unanswered || unanswered.length === 0) continue;

      const { data: answered } = await supabase
        .from("attendances")
        .select("user_id")
        .eq("schedule_id", schedule.id);
      const answeredIds = new Set((answered || []).map((a) => a.user_id));
      const unansweredIds = unanswered
        .map((m) => m.user_id)
        .filter((id) => !answeredIds.has(id));
      if (unansweredIds.length === 0) continue;

      // 通知設定が reminder=true & reminder_days_before=daysBefore のユーザーを絞り込む
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("user_id")
        .eq("team_id", schedule.team_id)
        .eq("reminder", true)
        .eq("reminder_days_before", daysBefore)
        .in("user_id", unansweredIds);

      // preferences 行が未作成のユーザー (デフォルト: reminder=true, days=3)
      const prefsUserIds = new Set((prefs || []).map((p) => p.user_id));
      const { data: allPrefsUsers } = await supabase
        .from("notification_preferences")
        .select("user_id")
        .eq("team_id", schedule.team_id)
        .in("user_id", unansweredIds);
      const hasPrefsIds = new Set((allPrefsUsers || []).map((p) => p.user_id));

      const targetUserIds = [...prefsUserIds];
      if (daysBefore === 3) {
        // デフォルト値 3 日前: preferences 行が未作成のユーザーも対象
        for (const uid of unansweredIds) {
          if (!hasPrefsIds.has(uid)) targetUserIds.push(uid);
        }
      }
      if (targetUserIds.length === 0) continue;

      // メールアドレス取得
      const { data: users } = await supabase
        .from("users")
        .select("id, email, notification_email")
        .in("id", targetUserIds);
      if (!users || users.length === 0) continue;

      const { subject, html } = reminderTemplate({
        teamName: team.name,
        teamId: team.id,
        scheduleId: schedule.id,
        scheduleDate: schedule.date,
        location: schedule.location,
        daysBefore,
      });

      for (const user of users) {
        const addr = user.notification_email || user.email;
        if (!addr) continue;
        const ok = await sendEmail({ to: addr, subject, html });
        if (ok) results.reminders++;
        else results.errors.push(`reminder send failed: ${user.id}`);
      }
    }
  }
}

// 締切通知送信
// 対象: deadline=true & deadline_days_before > 0 & 締切日が N 日後 & 未回答
async function sendDeadlineNotifications(
  supabase: ReturnType<typeof createAdminClient>,
  todayStr: string,
  results: CronResults
) {
  for (const daysBefore of [1, 3, 7]) {
    const targetDate = addDays(todayStr, daysBefore);

    // targetDate に締切がある日程を取得 (deadline が設定されているもの)
    const { data: schedules, error: schedErr } = await supabase
      .from("schedules")
      .select("id, team_id, date, location, note, deadline, teams(id, name)")
      .not("deadline", "is", null)
      .gte("deadline", `${targetDate}T00:00:00+09:00`)
      .lt("deadline", `${targetDate}T23:59:59+09:00`);

    if (schedErr || !schedules || schedules.length === 0) continue;

    for (const schedule of schedules) {
      const team = schedule.teams as unknown as { id: string; name: string } | null;
      if (!team || !schedule.deadline) continue;

      // 未回答メンバー取得
      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", schedule.team_id);
      if (!members || members.length === 0) continue;

      const { data: answered } = await supabase
        .from("attendances")
        .select("user_id")
        .eq("schedule_id", schedule.id);
      const answeredIds = new Set((answered || []).map((a) => a.user_id));
      const unansweredIds = members
        .map((m) => m.user_id)
        .filter((id) => !answeredIds.has(id));
      if (unansweredIds.length === 0) continue;

      // 通知設定: deadline=true & deadline_days_before=daysBefore
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("user_id")
        .eq("team_id", schedule.team_id)
        .eq("deadline", true)
        .eq("deadline_days_before", daysBefore)
        .in("user_id", unansweredIds);

      const prefsUserIds = new Set((prefs || []).map((p) => p.user_id));
      const { data: allPrefsUsers } = await supabase
        .from("notification_preferences")
        .select("user_id")
        .eq("team_id", schedule.team_id)
        .in("user_id", unansweredIds);
      const hasPrefsIds = new Set((allPrefsUsers || []).map((p) => p.user_id));

      const targetUserIds = [...prefsUserIds];
      if (daysBefore === 1) {
        // デフォルト値 1 日前: preferences 行が未作成のユーザーも対象
        for (const uid of unansweredIds) {
          if (!hasPrefsIds.has(uid)) targetUserIds.push(uid);
        }
      }
      if (targetUserIds.length === 0) continue;

      const { data: users } = await supabase
        .from("users")
        .select("id, email, notification_email")
        .in("id", targetUserIds);
      if (!users || users.length === 0) continue;

      const { subject, html } = deadlineTemplate({
        teamName: team.name,
        teamId: team.id,
        scheduleId: schedule.id,
        scheduleDate: schedule.date,
        location: schedule.location,
        deadline: schedule.deadline,
        daysBefore,
      });

      for (const user of users) {
        const addr = user.notification_email || user.email;
        if (!addr) continue;
        const ok = await sendEmail({ to: addr, subject, html });
        if (ok) results.deadlines++;
        else results.errors.push(`deadline send failed: ${user.id}`);
      }
    }
  }
}

// ヘルパ: "YYYY-MM-DD" に N 日加算
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
