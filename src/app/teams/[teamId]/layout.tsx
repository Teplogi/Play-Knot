import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeamNav } from "@/components/layout/TeamNav";

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

  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/teams");

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (!team) redirect("/teams");

  return (
    <div className="min-h-screen">
      <TeamNav teamId={teamId} teamName={team.name} role={member.role} />
      {/* メインコンテンツ：デスクトップはサイドバー分オフセット */}
      <main className="md:ml-60 pb-20 md:pb-8">
        <div className="animate-page-in max-w-3xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
