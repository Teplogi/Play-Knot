import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { cancelNotificationTemplate } from "@/lib/email/templates";

// 出欠の登録・更新（upsert）
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { scheduleId, status, comment } = await request.json();

    if (!scheduleId || !status) {
      return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
    }

    if (!["attend", "absent"].includes(status)) {
      return NextResponse.json({ error: "無効なステータスです" }, { status: 400 });
    }

    // 既存の出欠レコードを確認（ドタキャン検知用）
    const { data: existing } = await supabase
      .from("attendances")
      .select("id, status, created_at")
      .eq("schedule_id", scheduleId)
      .eq("user_id", user.id)
      .single();

    let isDotacan = false;

    if (existing) {
      // ドタキャン検知：参加→不参加に変更 かつ created_atと現在の日付が異なる
      if (existing.status === "attend" && status === "absent") {
        const createdDate = new Date(existing.created_at).toDateString();
        const nowDate = new Date().toDateString();
        if (createdDate !== nowDate) {
          isDotacan = true;
        }
      }

      // 既存レコードを更新
      const { data: attendance, error } = await supabase
        .from("attendances")
        .update({
          status,
          comment: comment || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: "出欠の更新に失敗しました" }, { status: 500 });
      }

      // ドタキャン時にホストへメール通知（非同期・失敗してもレスポンスに影響しない）
      if (isDotacan) {
        notifyCancelToHosts(supabase, scheduleId, user.id, comment).catch((err) =>
          console.error("キャンセル通知送信エラー:", err)
        );
      }

      return NextResponse.json({ attendance, isDotacan });
    }

    // 新規レコードを作成
    const { data: attendance, error } = await supabase
      .from("attendances")
      .insert({
        schedule_id: scheduleId,
        user_id: user.id,
        status,
        comment: comment || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "出欠の登録に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ attendance, isDotacan: false });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// ドタキャン時のホスト通知（非同期処理）
async function notifyCancelToHosts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scheduleId: string,
  userId: string,
  comment: string | null
) {
  // 日程 + チーム情報を取得
  const { data: schedule } = await supabase
    .from("schedules")
    .select("*, teams(id, name)")
    .eq("id", scheduleId)
    .single();

  if (!schedule) return;

  const team = schedule.teams as unknown as { id: string; name: string };

  // キャンセルしたユーザーの名前を取得
  const { data: cancelUser } = await supabase
    .from("users")
    .select("name")
    .eq("id", userId)
    .single();

  // ホスト全員のメールアドレスを取得
  const { data: hosts } = await supabase
    .from("team_members")
    .select("users(email)")
    .eq("team_id", team.id)
    .eq("role", "host");

  const hostEmails = (hosts || [])
    .map((h) => (h.users as unknown as { email: string })?.email)
    .filter(Boolean);

  if (hostEmails.length === 0) return;

  const { subject, html } = cancelNotificationTemplate({
    teamName: team.name,
    memberName: cancelUser?.name || "不明",
    scheduleDate: schedule.date,
    location: schedule.location,
    comment,
    teamId: team.id,
    scheduleId: schedule.id,
  });

  await sendEmail({ to: hostEmails, subject, html });
}
