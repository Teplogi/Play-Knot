import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// サーバ側の Supabase auth cookie (sb-*) をクリアする。
//
// NextResponse.cookies.set ではなく生の Set-Cookie ヘッダを直接 append。
// 本番(HTTPS)用に Secure 付き、保険として無し版も送って属性ミスマッチで
// 削除が無視されるケースを防ぐ。
// チャンク化された .0 / .1 cookie もまとめて拾える。
export async function POST() {
  const cookieStore = await cookies();
  const targetCookies = cookieStore
    .getAll()
    .filter((c) => c.name.startsWith("sb-"));

  const response = NextResponse.json({ ok: true });

  const expired = "Thu, 01 Jan 1970 00:00:00 GMT";
  for (const c of targetCookies) {
    response.headers.append(
      "Set-Cookie",
      `${c.name}=; Path=/; Max-Age=0; Expires=${expired}; HttpOnly; Secure; SameSite=Lax`
    );
    response.headers.append(
      "Set-Cookie",
      `${c.name}=; Path=/; Max-Age=0; Expires=${expired}; HttpOnly; SameSite=Lax`
    );
  }

  return response;
}
