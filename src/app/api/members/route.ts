import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ホスト権限チェック共通関数
async function verifyHost(supabase: Awaited<ReturnType<typeof createClient>>, teamId: string, userId: string) {
  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .single();
  return member?.role === "host";
}

// メンバー一覧取得
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "チームIDが必要です" }, { status: 400 });

    if (!(await verifyHost(supabase, teamId, user.id))) {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    const { data: members, error } = await supabase
      .from("team_members")
      .select("*, users(id, name, email)")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: "メンバーの取得に失敗しました" }, { status: 500 });

    return NextResponse.json(members);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// メンバー追加（既存ユーザーをチームに追加）
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

    const { teamId, userId, role, gender } = await request.json();
    if (!teamId || !userId) {
      return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
    }

    if (!(await verifyHost(supabase, teamId, user.id))) {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    const { data: member, error } = await supabase
      .from("team_members")
      .insert({
        team_id: teamId,
        user_id: userId,
        role: role || "guest",
        gender: gender || "未設定",
      })
      .select("*, users(id, name, email)")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "このメンバーは既に登録されています" }, { status: 409 });
      }
      return NextResponse.json({ error: "メンバーの追加に失敗しました" }, { status: 500 });
    }

    return NextResponse.json(member);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
