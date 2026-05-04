import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 日程へゲストを招集
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

    const { scheduleId, guestId } = await request.json();
    if (!scheduleId || !guestId) {
      return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
    }

    // schedule とゲストの team が一致しているかをまとめて検証する
    const [scheduleRes, guestRes] = await Promise.all([
      supabase.from("schedules").select("team_id").eq("id", scheduleId).single(),
      supabase.from("team_guests").select("team_id").eq("id", guestId).single(),
    ]);

    if (!scheduleRes.data || !guestRes.data) {
      return NextResponse.json({ error: "対象が見つかりません" }, { status: 404 });
    }
    if (scheduleRes.data.team_id !== guestRes.data.team_id) {
      return NextResponse.json({ error: "別チームのゲストは招集できません" }, { status: 400 });
    }

    // host / co_host 権限チェック
    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", scheduleRes.data.team_id)
      .eq("user_id", user.id)
      .single();
    if (member?.role !== "host" && member?.role !== "co_host") {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    const { data: row, error } = await supabase
      .from("schedule_guests")
      .insert({
        schedule_id: scheduleId,
        guest_id: guestId,
        invited_by: user.id,
      })
      .select()
      .single();

    if (error) {
      // UNIQUE 違反は冪等扱いで 409
      if (error.code === "23505") {
        return NextResponse.json({ error: "既に招集済みです" }, { status: 409 });
      }
      return NextResponse.json({ error: "招集に失敗しました" }, { status: 500 });
    }

    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
