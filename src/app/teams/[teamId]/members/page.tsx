import { createClient } from "@/lib/supabase/server";
import { requireUser, getTeamMembership } from "@/lib/auth";
import { MembersClient } from "./MembersClient";
import { hasHostPrivilege, type TeamGuest, type TeamMemberWithUser } from "@/types";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  await requireUser();
  const supabase = await createClient();

  const [membership, membersRes, guestsRes] = await Promise.all([
    getTeamMembership(teamId),
    supabase
      .from("team_members")
      .select("*, users(id, name, email, gender, birth_year, position, created_at)")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true }),
    supabase
      .from("team_guests")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true }),
  ]);

  const canManage = hasHostPrivilege(membership?.role ?? "guest");

  return (
    <MembersClient
      teamId={teamId}
      initialMembers={(membersRes.data ?? []) as TeamMemberWithUser[]}
      initialGuests={(guestsRes.data ?? []) as TeamGuest[]}
      canManage={canManage}
    />
  );
}
