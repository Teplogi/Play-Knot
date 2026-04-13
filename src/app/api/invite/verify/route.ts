import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 既ログイン状態で招待トークンを使ってチームに参加させる。
// accept_invite RPC が SECURITY DEFINER で team_members への INSERT と
// invite_tokens の使用済みマークを 1 トランザクションで実行する。
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "トークンが必要です" }, { status: 400 });
    }

    const { data: teamId, error } = await supabase.rpc("accept_invite", { p_token: token });

    if (error) {
      console.error("invite/verify accept_invite error:", error);
      const status = error.code === "42501" ? 401 : 400;
      return NextResponse.json(
        { error: error.message ?? "招待の受諾に失敗しました", detail: error.message },
        { status }
      );
    }

    return NextResponse.json({ teamId });
  } catch (e) {
    console.error("invite/verify server error:", e);
    return NextResponse.json({ error: "サーバーエラー", detail: String(e) }, { status: 500 });
  }
}
