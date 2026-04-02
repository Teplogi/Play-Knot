import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token = searchParams.get("token");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 招待トークンがある場合、チームに自動参加
      if (token) {
        try {
          await processInviteToken(supabase, token);
        } catch (e) {
          console.error("招待トークン処理エラー:", e);
        }
      }

      // チーム選択画面へリダイレクト
      return NextResponse.redirect(`${origin}/teams`);
    }
  }

  // エラー時はログイン画面へ
  return NextResponse.redirect(`${origin}/login`);
}

// 招待トークンを処理してチームに参加させる
async function processInviteToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  token: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // トークンを検証
  const { data: inviteToken } = await supabase
    .from("invite_tokens")
    .select("*")
    .eq("token", token)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!inviteToken) return;

  // 既にメンバーかチェック
  const { data: existing } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", inviteToken.team_id)
    .eq("user_id", user.id)
    .single();

  if (existing) return;

  // guestとしてチームに参加
  await supabase.from("team_members").insert({
    team_id: inviteToken.team_id,
    user_id: user.id,
    role: "guest",
  });

  // トークンを使用済みにする
  await supabase
    .from("invite_tokens")
    .update({ used_at: new Date().toISOString(), used_by: user.id })
    .eq("id", inviteToken.id);
}
