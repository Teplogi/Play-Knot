import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { teamId } = await request.json();
    if (!teamId) {
      return NextResponse.json({ error: "チームIDが必要です" }, { status: 400 });
    }

    // ホスト権限チェック
    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "host") {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    // 招待トークンを生成（有効期限: 7日間）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: inviteToken, error } = await supabase
      .from("invite_tokens")
      .insert({
        team_id: teamId,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select("token")
      .single();

    if (error) {
      return NextResponse.json({ error: "トークンの生成に失敗しました" }, { status: 500 });
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite?token=${inviteToken.token}`;

    return NextResponse.json({ inviteUrl, token: inviteToken.token });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
