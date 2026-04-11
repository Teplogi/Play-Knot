import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// サーバ側の Supabase auth cookie をクリアする。
//
// 確実に消すため、NextResponse.cookies.set ではなく
// 生の Set-Cookie ヘッダを直接 append する。
// レスポンス JSON にも検出した cookie 名を入れて、ブラウザの Network
// タブ → Preview からデバッグできるようにしてある。
export async function POST() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  // sb-* で始まる Supabase auth cookie を全削除対象にする
  const targetCookies = allCookies.filter((c) => c.name.startsWith("sb-"));

  const response = NextResponse.json({
    ok: true,
    foundCookies: allCookies.map((c) => c.name),
    deletedCookies: targetCookies.map((c) => c.name),
  });

  // 生の Set-Cookie ヘッダを append する
  // - secure / non-secure 両方の属性パターンを試して取りこぼしを防ぐ
  // - path=/ で root 配下の cookie をすべて対象にする
  for (const c of targetCookies) {
    const expired = "Thu, 01 Jan 1970 00:00:00 GMT";
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
