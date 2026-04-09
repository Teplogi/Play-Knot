// TODO: Supabase接続後に元のServer Component版に戻す
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TeamNav } from "@/components/layout/TeamNav";
import type { TeamRole } from "@/types";
import { hasHostPrivilege } from "@/types";

// host / co_host のみアクセス可能なパスセグメント（settings はゲストも通知設定用にアクセス可）
const HOST_ONLY_SEGMENTS = ["members", "ng-list", "attendance"];

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  // UIプレビュー用のモックデータ (TeamsClient のモックと揃える)
  const mockTeams: Record<string, { name: string; role: TeamRole }> = {
    "team-1": { name: "バスケットボール部", role: "host" },
    "team-2": { name: "フットサルサークル", role: "guest" },
    "team-3": { name: "テニスクラブ", role: "co_host" },
  };
  const mock = mockTeams[teamId] ?? { name: "テストチーム", role: "host" as const };
  const teamName = mock.name;
  const role = mock.role;

  // ゲストがホスト限定ページに直接アクセスした場合は 404
  if (!hasHostPrivilege(role)) {
    const pathname = (await headers()).get("x-pathname") ?? "";
    const segments = pathname.split("/").filter(Boolean);
    // 期待形: ["teams", teamId, <segment>, ...]
    const restrictedSegment = segments[2];
    if (restrictedSegment && HOST_ONLY_SEGMENTS.includes(restrictedSegment)) {
      notFound();
    }
  }

  return (
    <div className="min-h-screen">
      <TeamNav teamId={teamId} teamName={teamName} role={role} />
      <main className="md:ml-60 pb-20 md:pb-8">
        <div className="animate-page-in max-w-3xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
