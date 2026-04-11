import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
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
      let joinedTeamId: string | null = null;
      if (token) {
        try {
          joinedTeamId = await processInviteToken(supabase, token);
        } catch (e) {
          console.error("招待トークン処理エラー:", e);
        }
      }

      // 参加したチームがあればそこへ、なければチーム選択画面へ
      const dest = joinedTeamId ? `/teams/${joinedTeamId}` : "/teams";
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  // エラー時はログイン画面へ
  return NextResponse.redirect(`${origin}/login`);
}

// 招待トークンを処理してチームに参加させる
// team_members の INSERT は RLS が「host のみ」を要求するため
// service_role を使ってバイパスする必要がある
async function processInviteToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  token: string
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

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
    .gt("expires_at", new Date().toISOString())
    .single();

  if (tokenErr || !inviteToken) {
    console.error("invite token lookup failed:", tokenErr);
    return null;
  }

  // 既にメンバーかチェック
  const { data: existing } = await admin
    .from("team_members")
    .select("id")
    .eq("team_id", inviteToken.team_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return inviteToken.team_id as string;
  }

  // guest としてチームに参加（service_role で RLS バイパス）
  const { error: insertErr } = await admin.from("team_members").insert({
    team_id: inviteToken.team_id,
    user_id: user.id,
    role: "guest",
  });

  if (insertErr) {
    console.error("team_members insert failed:", insertErr);
    return null;
  }

  // トークンを使用済みにする
  const { error: updateErr } = await admin
    .from("invite_tokens")
    .update({ used_at: new Date().toISOString(), used_by: user.id })
    .eq("id", inviteToken.id);

  if (updateErr) {
    console.error("invite_tokens update failed:", updateErr);
  }

  return inviteToken.team_id as string;
}
