import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getTeamMembership } from "@/lib/auth";
import { ScheduleDetailClient } from "./ScheduleDetailClient";
import { hasHostPrivilege, type ScheduleGuestWithGuest, type TeamGuest } from "@/types";

export default async function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ teamId: string; scheduleId: string }>;
}) {
  const { teamId, scheduleId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [
    membership,
    scheduleRes,
    totalMembersRes,
    teamSettingsRes,
    invitedGuestsRes,
    teamGuestsRes,
  ] = await Promise.all([
    getTeamMembership(teamId),
    supabase
      .from("schedules")
      .select(
        "*, attendances(id, schedule_id, user_id, status, comment, updated_at, created_at, users(id, name, email, gender, birth_year, position, created_at))"
      )
      .eq("id", scheduleId)
      .single(),
    supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId),
    supabase
      .from("team_settings")
      .select("allow_tentative")
      .eq("team_id", teamId)
      .single(),
    supabase
      .from("schedule_guests")
      .select("*, team_guests(*)")
      .eq("schedule_id", scheduleId)
      .order("created_at", { ascending: true }),
    supabase
      .from("team_guests")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true }),
  ]);

  const schedule = scheduleRes.data;
  if (!schedule) notFound();

  const canManageSchedule = hasHostPrivilege(membership?.role ?? "guest");
  const totalMembers = totalMembersRes.count;
  const allowTentative = teamSettingsRes.data?.allow_tentative ?? false;

  const myAttendance =
    schedule.attendances?.find((a: { user_id: string }) => a.user_id === user.id) ?? null;

  return (
    <ScheduleDetailClient
      schedule={schedule}
      attendances={schedule.attendances ?? []}
      totalMembers={totalMembers ?? 0}
      myAttendance={myAttendance}
      canManageSchedule={canManageSchedule}
      teamId={teamId}
      allowTentative={allowTentative}
      invitedGuests={(invitedGuestsRes.data ?? []) as ScheduleGuestWithGuest[]}
      teamGuests={(teamGuestsRes.data ?? []) as TeamGuest[]}
    />
  );
}
