import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeamHomeClient } from "./TeamHomeClient";

export default async function TeamHomePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/teams");

  // メンバー数
  const { count: memberCount } = await supabase
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId);

  // 次回の日程を取得
  const { data: nextSchedule } = await supabase
    .from("schedules")
    .select("*, attendances(*)")
    .eq("team_id", teamId)
    .gte("date", new Date().toISOString())
    .order("date", { ascending: true })
    .limit(1)
    .single();

  // 自分の出欠
  const myAttendance = nextSchedule?.attendances?.find(
    (a: { user_id: string }) => a.user_id === user.id
  ) || null;

  const attendCount = nextSchedule?.attendances?.filter(
    (a: { status: string }) => a.status === "attend"
  ).length || 0;

  return (
    <TeamHomeClient
      teamId={teamId}
      isHost={member.role === "host"}
      memberCount={memberCount || 0}
      nextSchedule={nextSchedule}
      myAttendance={myAttendance}
      attendCount={attendCount}
    />
  );
}
