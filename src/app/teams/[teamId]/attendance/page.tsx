import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { AttendanceStatsClient } from "./AttendanceStatsClient";
import { calcMemberStats } from "@/lib/attendance/stats";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  await requireUser();
  const supabase = await createClient();

  // メンバー / スケジュール+出欠 を並列取得
  const [membersRes, schedulesRes] = await Promise.all([
    supabase.from("team_members").select("user_id, users(name)").eq("team_id", teamId),
    supabase
      .from("schedules")
      .select("id, date, attendances(user_id, status, created_at, updated_at)")
      .eq("team_id", teamId),
  ]);

  const members = membersRes.data;
  const schedules = schedulesRes.data;

  const memberInputs = (members ?? []).map((m) => ({
    user_id: m.user_id,
    name: (m.users as unknown as { name: string })?.name ?? "不明",
  }));

  const attendanceInputs = (schedules ?? []).flatMap((s) =>
    (s.attendances ?? []).map((a: { user_id: string; status: "attend" | "absent"; created_at: string; updated_at: string }) => ({
      user_id: a.user_id,
      status: a.status,
      created_at: a.created_at,
      updated_at: a.updated_at,
      schedule_date: s.date,
    }))
  );

  const stats = calcMemberStats(memberInputs, attendanceInputs);

  return <AttendanceStatsClient stats={stats} />;
}
