import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getTeamMembership } from "@/lib/auth";
import { ScheduleDetailClient } from "./ScheduleDetailClient";
import { hasHostPrivilege } from "@/types";

export default async function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ teamId: string; scheduleId: string }>;
}) {
  const { teamId, scheduleId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  // ロール / 日程詳細 / メンバー数 を並列取得
  const [membership, scheduleRes, totalMembersRes] = await Promise.all([
    getTeamMembership(teamId),
    supabase
      .from("schedules")
      .select("*, attendances(id, schedule_id, user_id, status, comment, updated_at, created_at, users(id, name, email, gender, birth_year, position, created_at))")
      .eq("id", scheduleId)
      .single(),
    supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId),
  ]);

  const schedule = scheduleRes.data;
  if (!schedule) notFound();

  const canManageSchedule = hasHostPrivilege(membership?.role ?? "guest");
  const totalMembers = totalMembersRes.count;

  // 自分の出欠
  const myAttendance = schedule.attendances?.find(
    (a: { user_id: string }) => a.user_id === user.id
  ) ?? null;

  return (
    <ScheduleDetailClient
      schedule={schedule}
      attendances={schedule.attendances ?? []}
      totalMembers={totalMembers ?? 0}
      myAttendance={myAttendance}
      canManageSchedule={canManageSchedule}
      teamId={teamId}
    />
  );
}
