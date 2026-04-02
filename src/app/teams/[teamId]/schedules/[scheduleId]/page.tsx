import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScheduleDetailClient } from "./ScheduleDetailClient";

export default async function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ teamId: string; scheduleId: string }>;
}) {
  const { teamId, scheduleId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // メンバー情報を取得
  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/teams");

  // 日程情報を取得
  const { data: schedule } = await supabase
    .from("schedules")
    .select("*")
    .eq("id", scheduleId)
    .eq("team_id", teamId)
    .single();

  if (!schedule) redirect(`/teams/${teamId}/schedules`);

  // 出欠一覧をユーザー情報付きで取得
  const { data: attendances } = await supabase
    .from("attendances")
    .select("*, users(id, name, email)")
    .eq("schedule_id", scheduleId);

  // チームの全メンバー数を取得
  const { count: totalMembers } = await supabase
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId);

  // 自分の出欠を取得
  const myAttendance = attendances?.find((a) => a.user_id === user.id) || null;

  return (
    <ScheduleDetailClient
      schedule={schedule}
      attendances={attendances || []}
      totalMembers={totalMembers || 0}
      myAttendance={myAttendance}
      isHost={member.role === "host"}
      teamId={teamId}
    />
  );
}
