import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// サーバ側の Supabase auth cookie をクリアする
// （クライアントの signOut({ scope: "local" }) では httpOnly cookie が残り
//   middleware の getUser() が通ってしまうため、サーバから signOut する）
export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // 既にセッションが無い場合などは無視して 200 を返す
  }
  return NextResponse.json({ ok: true });
}
