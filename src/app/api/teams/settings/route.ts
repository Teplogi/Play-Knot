import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// チーム基本情報更新
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { teamId, name, sportType, description, iconColor } = await request.json();

    // ホスト権限チェック
    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!member || (member.role !== "host" && member.role !== "co_host")) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const { error } = await supabase
      .from("teams")
      .update({
        name,
        sport_type: sportType || "",
        icon_color: iconColor || "indigo",
      })
      .eq("id", teamId);

    if (error) {
      return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
