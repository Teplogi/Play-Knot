import { createClient } from "@/lib/supabase/server";
import { requireUser, getTeamMembership } from "@/lib/auth";
import { ScheduleListClient } from "./ScheduleListClient";
import { hasHostPrivilege } from "@/types";

export default async function SchedulesPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  // ロール / メンバー数 / 日程一覧 / チーム設定 を並列取得
  const [membership, totalMembersRes, schedulesRes, teamSettingsRes] = await Promise.all([
    getTeamMembership(teamId),
    supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId),
    supabase
      .from("schedules")
      .select("*, attendances(id, schedule_id, user_id, status, comment, updated_at, created_at)")
      .eq("team_id", teamId)
      .order("date", { ascending: true }),
    supabase
      .from("team_settings")
      .select("default_start_time, default_end_time, attendance_deadline_hours_before, default_locations")
      .eq("team_id", teamId)
      .single(),
  ]);

  const canManageSchedule = hasHostPrivilege(membership?.role ?? "guest");
  const totalMembers = totalMembersRes.count;
  const schedules = schedulesRes.data;
  const teamSettings = teamSettingsRes.data;

  const scheduleDefaults = teamSettings ? {
    startTime: teamSettings.default_start_time ?? "19:00",
    endTime: teamSettings.default_end_time ?? "21:00",
    deadlineHoursBefore: teamSettings.attendance_deadline_hours_before ?? 1,
    locations: teamSettings.default_locations ?? [],
  } : undefined;

  return (
    <ScheduleListClient
      teamId={teamId}
      schedules={schedules ?? []}
      totalMembers={totalMembers ?? 0}
      userId={user.id}
      canManageSchedule={canManageSchedule}
      scheduleDefaults={scheduleDefaults}
    />
  );
}
