import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// サーバ側の Supabase auth cookie をクリアする。
//
// Supabase client (signOut) 経由ではなく Next.js の cookieStore で
// 直接 sb-* cookie を expire させる方式。
// supabase.auth.signOut() は内部で getUser() 相当を呼んだり storage
// adapter を経由したりするため、rate limit や setAll の握り潰しで
// cookie 削除が走らないことがある。直接削除すれば確実。
export async function POST() {
  const response = NextResponse.json({ ok: true });

  try {
    const cookieStore = await cookies();
    for (const c of cookieStore.getAll()) {
      if (c.name.startsWith("sb-")) {
        // 同じ名前で空文字 + maxAge:0 を Response に乗せて確実に削除
        response.cookies.set({
          name: c.name,
          value: "",
          path: "/",
          maxAge: 0,
          expires: new Date(0),
          httpOnly: true,
          sameSite: "lax",
        });
      }
    }
  } catch {
    /* noop */
  }

  return response;
}
