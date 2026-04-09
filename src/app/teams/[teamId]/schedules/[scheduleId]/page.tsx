import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScheduleDetailClient } from "./ScheduleDetailClient";
import { hasHostPrivilege } from "@/types";

export default async function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ teamId: string; scheduleId: string }>;
}) {
  const { teamId, scheduleId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ロール
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  const canManageSchedule = hasHostPrivilege(membership?.role ?? "guest");

  // 日程（出欠 + ユーザー情報つき）
  const { data: schedule } = await supabase
    .from("schedules")
    .select("*, attendances(id, schedule_id, user_id, status, comment, updated_at, created_at, users(id, name, email, gender, birth_year, position, created_at))")
    .eq("id", scheduleId)
    .single();

  if (!schedule) notFound();

  // メンバー数
  const { count: totalMembers } = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);

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
