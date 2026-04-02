import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ホスト専用パス（/teams/[teamId]/ 配下）
const HOST_ONLY_PATHS = ["/members", "/ng-list", "/attendance", "/settings"];

// ミドルウェア用Supabaseクライアント（セッション更新を処理）
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 未認証ユーザーを/teams以下からリダイレクト
  if (!user && pathname.startsWith("/teams")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 認証済みユーザーが/loginにアクセスした場合はチーム選択画面へリダイレクト
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/teams";
    return NextResponse.redirect(url);
  }

  // ホスト専用ルートの権限チェック
  if (user && pathname.startsWith("/teams/")) {
    const isHostOnlyPath = HOST_ONLY_PATHS.some((path) => pathname.endsWith(path));

    if (isHostOnlyPath) {
      // URLからteamIdを抽出: /teams/[teamId]/members → teamId
      const segments = pathname.split("/");
      const teamId = segments[2];

      if (teamId) {
        const { data: member } = await supabase
          .from("team_members")
          .select("role")
          .eq("team_id", teamId)
          .eq("user_id", user.id)
          .single();

        // ホストでなければチームホームへリダイレクト
        if (!member || member.role !== "host") {
          const url = request.nextUrl.clone();
          url.pathname = `/teams/${teamId}`;
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return supabaseResponse;
}
