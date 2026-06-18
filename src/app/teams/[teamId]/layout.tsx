import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getTeamMembership } from "@/lib/auth";
import { TeamNav } from "@/components/layout/TeamNav";
import { SportBackground } from "@/components/brand/SportBackground";
import { resolveSport } from "@/lib/sports";
import { hasHostPrivilege } from "@/types";

const HOST_ONLY_SEGMENTS = ["members", "ng-list", "attendance"];

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  // 認証 + 並列でチーム名・スポーツ種別・メンバーシップを取得
  await requireUser();
  const supabase = await createClient();
  const [teamRes, membership] = await Promise.all([
    supabase.from("teams").select("name, sport_type, icon_color, icon_url, background_enabled").eq("id", teamId).single(),
    getTeamMembership(teamId),
  ]);

  const team = teamRes.data;
  if (!team) notFound();
  if (!membership) notFound();

  const role = membership.role;
  const sport = resolveSport(team.sport_type);
  // 背景写真の表示可否。未設定（NULL）の既存チームは従来どおり表示する。
  const showBackground = team.background_enabled ?? true;

  // ゲストがホスト限定ページに直接アクセスした場合は 404
  if (!hasHostPrivilege(role)) {
    const pathname = (await headers()).get("x-pathname") ?? "";
    const segments = pathname.split("/").filter(Boolean);
    const restrictedSegment = segments[2];
    if (restrictedSegment && HOST_ONLY_SEGMENTS.includes(restrictedSegment)) {
      notFound();
    }
  }

  return (
    // 画面全体を「固定トップバー＋スクロールする操作領域」の2段構成にする。
    // 外枠を画面高さ固定 + overflow-hidden にし、ドキュメント自体はスクロールさせない。
    // こうするとスマホで上に行き過ぎてもトップバーが追従して動くことがなく、
    // 動くのは <main> の中身（操作画面）だけになる。
    <div className="h-[100dvh] flex flex-col overflow-hidden relative">
      {showBackground && <SportBackground sport={sport} />}
      <TeamNav
        teamId={teamId}
        teamName={team.name}
        role={role}
        iconColor={team.icon_color ?? "indigo"}
        iconUrl={team.icon_url ?? null}
      />
      <main className="flex-1 overflow-y-auto overscroll-contain pb-8">
        <div className={`animate-page-in max-w-3xl mx-auto px-4 sm:px-6 py-6 ${showBackground ? "text-halo" : ""}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
