import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MembersClient } from "./MembersClient";
import type { TeamMemberWithUser } from "@/types";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: members } = await supabase
    .from("team_members")
    .select("*, users(id, name, email, gender, birth_year, position, created_at)")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });

  return <MembersClient teamId={teamId} initialMembers={(members ?? []) as TeamMemberWithUser[]} />;
}
