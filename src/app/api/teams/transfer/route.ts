import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// オーナー譲渡
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { teamId, newOwnerId } = await request.json();

    const { error } = await supabase.rpc("transfer_team_ownership", {
      p_team_id: teamId,
      p_new_owner_id: newOwnerId,
    });

    if (error) {
      const status = error.code === "42501" ? 403 : 500;
      return NextResponse.json(
        { error: error.code === "42501" ? "ホスト権限が必要です" : "譲渡に失敗しました", detail: error.message },
        { status }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
