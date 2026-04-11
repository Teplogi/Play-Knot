import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// 既ログイン状態で招待トークンを使ってチームに参加させる。
// team_members への INSERT は RLS が「host のみ」を要求するため
// service_role を使ってバイパスする。
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 認証チェック（現在のユーザ確認は anon クライアントで OK）
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "トークンが必要です" }, { status: 400 });
    }

    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // トークンを検証
    const { data: inviteToken, error: tokenErr } = await admin
      .from("invite_tokens")
      .select("*")
      .eq("token", token)
      .is("used_at", null)
      .single();

    if (tokenErr || !inviteToken) {
      return NextResponse.json(
        { error: "無効なトークンです", detail: tokenErr?.message },
        { status: 400 }
      );
    }

    // 有効期限チェック
    if (new Date(inviteToken.expires_at) < new Date()) {
      return NextResponse.json({ error: "トークンの有効期限が切れています" }, { status: 400 });
    }

    // 既にメンバーかチェック
    const { data: existing } = await admin
      .from("team_members")
      .select("id")
      .eq("team_id", inviteToken.team_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ teamId: inviteToken.team_id });
    }

    // guest としてチームに参加（service_role で RLS バイパス）
    const { error: insertError } = await admin
      .from("team_members")
      .insert({
        team_id: inviteToken.team_id,
        user_id: user.id,
        role: "guest",
      });

    if (insertError) {
      console.error("invite/verify team_members insert error:", insertError);
      return NextResponse.json(
        { error: "チームへの参加に失敗しました", detail: insertError.message },
        { status: 500 }
      );
    }

    // トークンを使用済みにする
    await admin
      .from("invite_tokens")
      .update({ used_at: new Date().toISOString(), used_by: user.id })
      .eq("id", inviteToken.id);

    return NextResponse.json({ teamId: inviteToken.team_id });
  } catch (e) {
    console.error("invite/verify server error:", e);
    return NextResponse.json({ error: "サーバーエラー", detail: String(e) }, { status: 500 });
  }
}
