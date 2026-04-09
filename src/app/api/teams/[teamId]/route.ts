import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// チーム削除（ホストのみ）
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // ホスト確認
    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "host") {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    // CASCADE で関連データも削除される
    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("id", teamId);

    if (error) {
      return NextResponse.json({ error: "チームの削除に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
