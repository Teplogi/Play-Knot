import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// チーム基本情報更新
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { teamId, name, sportType, description, iconColor } = await request.json();

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

    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!member || (member.role !== "host" && member.role !== "co_host")) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    // RLSバイパスでupsert
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existing } = await admin
      .from("team_settings")
      .select("id")
      .eq("team_id", teamId)
      .single();

    if (existing) {
      const { error } = await admin
        .from("team_settings")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("team_id", teamId);
      if (error) {
        return NextResponse.json({ error: "更新に失敗しました", detail: error.message }, { status: 500 });
      }
    } else {
      const { error } = await admin
        .from("team_settings")
        .insert({ team_id: teamId, ...fields });
      if (error) {
        return NextResponse.json({ error: "作成に失敗しました", detail: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "サーバーエラー", detail: String(e) }, { status: 500 });
  }
}
