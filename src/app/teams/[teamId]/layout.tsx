import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getTeamMembership } from "@/lib/auth";
import { TeamNav } from "@/components/layout/TeamNav";
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

  // 認証 + 並列でチーム名・メンバーシップを取得
  await requireUser();
  const supabase = await createClient();
  const [teamRes, membership] = await Promise.all([
    supabase.from("teams").select("name").eq("id", teamId).single(),
    getTeamMembership(teamId),
  ]);

  const team = teamRes.data;
  if (!team) notFound();
  if (!membership) notFound();

  const role = membership.role;

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
    <div className="min-h-screen">
      <TeamNav teamId={teamId} teamName={team.name} role={role} />
      <main className="md:ml-60 pb-8">
        <div className="animate-page-in max-w-3xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
