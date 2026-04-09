import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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

    // RLSをバイパスするためservice_roleクライアントを使用
    // （チーム作成時はまだメンバーが存在しないためRLSポリシーを通過できない）
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // チーム作成
    const { data: team, error: teamError } = await admin
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
    const { error: memberError } = await admin
      .from("team_members")
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: "host",
      });

    if (memberError) {
      await admin.from("teams").delete().eq("id", team.id);
      return NextResponse.json({ error: "チームの作成に失敗しました" }, { status: 500 });
    }

    return NextResponse.json(team);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
