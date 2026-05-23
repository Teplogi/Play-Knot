import { createClient } from "@/lib/supabase/server";
import { requireUser, getTeamMembership } from "@/lib/auth";
import { TeamHomeClient } from "./TeamHomeClient";
import type { Schedule, Attendance } from "@/types";

type ScheduleWithAttendances = Schedule & { attendances: Attendance[] };

export default async function TeamHomePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const now = new Date().toISOString();
  const [, memberCountRes, upcomingSchedulesRes] = await Promise.all([
    getTeamMembership(teamId),
    supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId),
    supabase
      .from("schedules")
      .select("*, attendances(id, schedule_id, user_id, status, comment, updated_at, created_at)")
      .eq("team_id", teamId)
      .gte("date", now)
      .order("date", { ascending: true })
      .limit(2),
  ]);

  const memberCount = memberCountRes.count;
  const upcomingSchedules: ScheduleWithAttendances[] = upcomingSchedulesRes.data ?? [];

  // 各日程に対する自分の出欠 + 参加人数を事前計算
  const upcomingItems = upcomingSchedules.map((schedule) => {
    const myAttendance = schedule.attendances?.find((a) => a.user_id === user.id) ?? null;
    const attendCount = schedule.attendances?.filter((a) => a.status === "attend").length ?? 0;
    return { schedule, myAttendance, attendCount };
  });

  return (
    <TeamHomeClient
      teamId={teamId}
      memberCount={memberCount ?? 0}
      upcomingItems={upcomingItems}
    />
  );
}
