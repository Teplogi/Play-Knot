import { type NextRequest, NextResponse } from "next/server";
// import { updateSession } from "@/lib/supabase/middleware";

// TODO: Supabase接続後にコメントを外す
export async function proxy(request: NextRequest) {
  // return await updateSession(request);
  // レイアウト側で現在のパスを参照できるようヘッダに付与する
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
