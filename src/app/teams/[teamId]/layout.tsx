import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { TeamNav } from "@/components/layout/TeamNav";
import type { TeamRole } from "@/types";
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // チーム名を取得
  const { data: team } = await supabase
    .from("teams")
    .select("name")
    .eq("id", teamId)
    .single();

  if (!team) notFound();

  // ユーザーのロールを取得
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (!membership) notFound();

  const role = membership.role as TeamRole;

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
      <main className="md:ml-60 pb-20 md:pb-8">
        <div className="animate-page-in max-w-3xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
