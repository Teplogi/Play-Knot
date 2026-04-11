import { createClient } from "@/lib/supabase/server";
import { requireUser, getTeamMembership } from "@/lib/auth";
import { TeamHomeClient } from "./TeamHomeClient";
import { hasHostPrivilege } from "@/types";

export default async function TeamHomePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  // メンバーシップ・人数・次回日程を並列取得
  const now = new Date().toISOString();
  const [membership, memberCountRes, nextScheduleRes] = await Promise.all([
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
      .limit(1)
      .single(),
  ]);

  const isHost = hasHostPrivilege(membership?.role ?? "guest");
  const memberCount = memberCountRes.count;
  const nextSchedule = nextScheduleRes.data;

  // 自分の出欠
  const myAttendance = nextSchedule?.attendances?.find(
    (a: { user_id: string }) => a.user_id === user.id
  ) ?? null;

  const attendCount = nextSchedule?.attendances?.filter(
    (a: { status: string }) => a.status === "attend"
  ).length ?? 0;

  return (
    <TeamHomeClient
      teamId={teamId}
      isHost={isHost}
      memberCount={memberCount ?? 0}
      nextSchedule={nextSchedule ?? null}
      myAttendance={myAttendance}
      attendCount={attendCount}
    />
  );
}
