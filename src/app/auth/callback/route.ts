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
      // ログイン成功後、まず public.users 行の存在を保証する
      // (DB トリガーが失敗しても招待や日程作成等で FK エラーにならないように)
      try {
        const { error: ensureErr } = await supabase.rpc("ensure_public_user");
        if (ensureErr) console.error("ensure_public_user failed:", ensureErr);
      } catch (e) {
        console.error("ensure_public_user threw:", e);
      }

      // 招待トークンがある場合、チームに自動参加
      let joinedTeamId: string | null = null;
      if (token) {
        try {
          const { data, error: acceptErr } = await supabase.rpc("accept_invite", { p_token: token });
          if (acceptErr) {
            console.error("accept_invite failed:", acceptErr);
          } else {
            joinedTeamId = data as string;
          }
        } catch (e) {
          console.error("accept_invite threw:", e);
        }
      }

      const dest = joinedTeamId ? `/teams/${joinedTeamId}` : "/teams";
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
