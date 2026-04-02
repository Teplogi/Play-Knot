import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 日程作成（ホストのみ）
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { teamId, date, location, note } = await request.json();

    // ホスト権限チェック
    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "host") {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    const { data: schedule, error } = await supabase
      .from("schedules")
      .insert({
        team_id: teamId,
        date,
        location,
        note: note || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "日程の作成に失敗しました" }, { status: 500 });
    }

    return NextResponse.json(schedule);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// 日程更新（ホストのみ）
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { scheduleId, teamId, date, location, note } = await request.json();

    // ホスト権限チェック
    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "host") {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    const { data: schedule, error } = await supabase
      .from("schedules")
      .update({ date, location, note: note || null })
      .eq("id", scheduleId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "日程の更新に失敗しました" }, { status: 500 });
    }

    return NextResponse.json(schedule);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// 日程削除（ホストのみ）
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { scheduleId, teamId } = await request.json();

    // ホスト権限チェック
    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "host") {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("id", scheduleId);

    if (error) {
      return NextResponse.json({ error: "日程の削除に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
