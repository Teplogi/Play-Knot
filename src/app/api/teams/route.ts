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

    const { data: team, error } = await supabase
      .rpc("create_team", { p_name: name, p_sport_type: sportType ?? "" })
      .single();

    if (error) {
      // 42501 = insufficient_privilege（権限なし or 認証なし）
      const status = error.code === "42501" ? 403 : 500;
      const message =
        error.code === "42501"
          ? "チームの新規作成権限がありません"
          : "チームの作成に失敗しました";
      return NextResponse.json({ error: message, detail: error.message }, { status });
    }

    return NextResponse.json(team);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
