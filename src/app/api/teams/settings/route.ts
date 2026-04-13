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

    const { teamId, name, sportType, iconColor } = await request.json();

    const { error } = await supabase
      .from("teams")
      .update({
        name,
        sport_type: sportType || "",
        icon_color: iconColor || "indigo",
      })
      .eq("id", teamId);

    if (error) {
      return NextResponse.json({ error: "更新に失敗しました", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// チーム設定（日程デフォルト・チーム分けデフォルト）の upsert
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { teamId, ...fields } = body;

    const { error } = await supabase
      .from("team_settings")
      .upsert(
        { team_id: teamId, ...fields, updated_at: new Date().toISOString() },
        { onConflict: "team_id" }
      );

    if (error) {
      return NextResponse.json({ error: "保存に失敗しました", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "サーバーエラー", detail: String(e) }, { status: 500 });
  }
}
