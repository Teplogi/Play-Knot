import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// NG削除
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ pairId: string }> }
) {
  try {
    const { pairId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

    const { teamId } = await request.json();
    if (!teamId) return NextResponse.json({ error: "チームIDが必要です" }, { status: 400 });

    // ホスト権限チェック
    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!member || (member.role !== "host" && member.role !== "co_host")) {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    const { error } = await supabase
      .from("ng_pairs")
      .delete()
      .eq("id", pairId)
      .eq("team_id", teamId);

    if (error) return NextResponse.json({ error: "NGペアの削除に失敗しました" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
