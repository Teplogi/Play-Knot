import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_NOTIFICATION_PREFS } from "@/types";

// GET: 自分の通知設定を取得
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    if (!teamId) {
      return NextResponse.json({ error: "teamIdが必要です" }, { status: 400 });
    }

    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .eq("team_id", teamId)
      .single();

    // 未保存の場合はデフォルト値を返す（初回保存時に行が作られる）
    if (!preferences) {
      return NextResponse.json(DEFAULT_NOTIFICATION_PREFS);
    }

    return NextResponse.json(preferences);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// PUT: 自分の通知設定を保存（upsert）
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { teamId, schedule_created, schedule_changed, reminder, deadline, reopened } =
      await request.json();

    if (!teamId) {
      return NextResponse.json({ error: "teamIdが必要です" }, { status: 400 });
    }

    // チームメンバーであることを確認
    const { data: member } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "チームのメンバーではありません" }, { status: 403 });
    }

    const { data: preferences, error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: user.id,
          team_id: teamId,
          schedule_created,
          schedule_changed,
          reminder,
          deadline,
          reopened,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,team_id" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "通知設定の保存に失敗しました" }, { status: 500 });
    }

    return NextResponse.json(preferences);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
