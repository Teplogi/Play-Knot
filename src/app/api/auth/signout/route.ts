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
  const isProd = process.env.NODE_ENV === "production";

  try {
    const cookieStore = await cookies();
    for (const c of cookieStore.getAll()) {
      if (c.name.startsWith("sb-")) {
        // 同じ name + path で expires:0 を Set-Cookie する。
        // 本番(HTTPS)では元 cookie が secure 属性付きなので、削除側も
        // secure を立てておかないとブラウザが上書きを受け付けないことがある。
        response.cookies.set({
          name: c.name,
          value: "",
          path: "/",
          maxAge: 0,
          expires: new Date(0),
          httpOnly: true,
          sameSite: "lax",
          secure: isProd,
        });
      }
    }
  } catch {
    /* noop */
  }

  return response;
}
