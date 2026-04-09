import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// チーム作成
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { name, sportType } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "チーム名は必須です" }, { status: 400 });
    }

    // チーム作成
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        name: name.trim(),
        sport_type: sportType?.trim() || "",
        icon_color: "indigo",
        created_by: user.id,
      })
      .select()
      .single();

    if (teamError) {
      return NextResponse.json({ error: "チームの作成に失敗しました" }, { status: 500 });
    }

    // 作成者をホストとして追加
    const { error: memberError } = await supabase
      .from("team_members")
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: "host",
      });

    if (memberError) {
      // チーム作成は成功したがメンバー追加に失敗 → チームを削除
      await supabase.from("teams").delete().eq("id", team.id);
      return NextResponse.json({ error: "チームの作成に失敗しました" }, { status: 500 });
    }

    return NextResponse.json(team);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
