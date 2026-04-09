import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// オーナー譲渡
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { teamId, newOwnerId } = await request.json();

    // 現在のユーザーがホストか確認
    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "host") {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 新オーナーをhostに
    await admin
      .from("team_members")
      .update({ role: "host" })
      .eq("team_id", teamId)
      .eq("user_id", newOwnerId);

    // 旧オーナーをguestに
    await admin
      .from("team_members")
      .update({ role: "guest" })
      .eq("team_id", teamId)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
