import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { calcMemberStats } from "@/lib/attendance/stats";
import { AttendanceStatsClient } from "./AttendanceStatsClient";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ホスト権限チェック
  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (!member || member.role !== "host") redirect(`/teams/${teamId}`);

  // 全メンバー取得
  const { data: teamMembers } = await supabase
    .from("team_members")
    .select("user_id, users(id, name)")
    .eq("team_id", teamId);

  const members = (teamMembers || []).map((tm) => {
    const u = tm.users as unknown as { id: string; name: string };
    return { user_id: u.id, name: u.name };
  });

  // このチームの全日程IDを取得
  const { data: schedules } = await supabase
    .from("schedules")
    .select("id")
    .eq("team_id", teamId);

  const scheduleIds = (schedules || []).map((s) => s.id);

  // 全出欠データを取得
  let attendances: { user_id: string; status: "attend" | "absent"; created_at: string; updated_at: string }[] = [];
  if (scheduleIds.length > 0) {
    const { data } = await supabase
      .from("attendances")
      .select("user_id, status, created_at, updated_at")
      .in("schedule_id", scheduleIds);

    attendances = (data || []) as typeof attendances;
  }

  const stats = calcMemberStats(members, attendances);

  return <AttendanceStatsClient stats={stats} />;
}
