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

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "トークンが必要です" }, { status: 400 });
    }

    // トークンを検証
    const { data: inviteToken } = await supabase
      .from("invite_tokens")
      .select("*")
      .eq("token", token)
      .is("used_at", null)
      .single();

    if (!inviteToken) {
      return NextResponse.json({ error: "無効なトークンです" }, { status: 400 });
    }

    // 有効期限チェック（7日間）
    if (new Date(inviteToken.expires_at) < new Date()) {
      return NextResponse.json({ error: "トークンの有効期限が切れています" }, { status: 400 });
    }

    // 既にメンバーかチェック
    const { data: existing } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", inviteToken.team_id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      // 既にメンバーの場合はそのままチームIDを返す
      return NextResponse.json({ teamId: inviteToken.team_id });
    }

    // guestとしてチームに参加
    const { error: insertError } = await supabase
      .from("team_members")
      .insert({
        team_id: inviteToken.team_id,
        user_id: user.id,
        role: "guest",
      });

    if (insertError) {
      return NextResponse.json({ error: "チームへの参加に失敗しました" }, { status: 500 });
    }

    // トークンを使用済みにする
    await supabase
      .from("invite_tokens")
      .update({ used_at: new Date().toISOString(), used_by: user.id })
      .eq("id", inviteToken.id);

    return NextResponse.json({ teamId: inviteToken.team_id });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
