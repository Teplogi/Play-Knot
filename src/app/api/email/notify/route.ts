import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { cancelNotificationTemplate } from "@/lib/email/templates";

// キャンセル通知送信
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

    const { scheduleId, comment } = await request.json();
    if (!scheduleId) return NextResponse.json({ error: "スケジュールIDが必要です" }, { status: 400 });

    // 日程とチーム情報を取得
    const { data: schedule } = await supabase
      .from("schedules")
      .select("*, teams(id, name)")
      .eq("id", scheduleId)
      .single();

    if (!schedule) return NextResponse.json({ error: "日程が見つかりません" }, { status: 404 });

    const team = schedule.teams as unknown as { id: string; name: string };

    // キャンセルしたユーザーの名前を取得
    const { data: cancelUser } = await supabase
      .from("users")
      .select("name")
      .eq("id", user.id)
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

    if (hostEmails.length === 0) {
      return NextResponse.json({ sent: false, reason: "ホストが見つかりません" });
    }

    const { subject, html } = cancelNotificationTemplate({
      teamName: team.name,
      memberName: cancelUser?.name || "不明",
      scheduleDate: schedule.date,
      location: schedule.location,
      comment: comment || null,
      teamId: team.id,
      scheduleId: schedule.id,
    });

    // 非同期送信（結果を待たない）
    sendEmail({ to: hostEmails, subject, html });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("通知APIエラー:", err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
