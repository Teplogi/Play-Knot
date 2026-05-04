import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 招集を解除
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

    // schedule_guests から schedule の team_id を辿って権限チェック
    const { data: row } = await supabase
      .from("schedule_guests")
      .select("schedule_id, schedules(team_id)")
      .eq("id", id)
      .single();

    if (!row) {
      return NextResponse.json({ error: "対象が見つかりません" }, { status: 404 });
    }

    const teamId = (row.schedules as unknown as { team_id: string } | null)?.team_id;
    if (!teamId) {
      return NextResponse.json({ error: "対象が見つかりません" }, { status: 404 });
    }

    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();
    if (member?.role !== "host" && member?.role !== "co_host") {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    const { error } = await supabase
      .from("schedule_guests")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "招集解除に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
