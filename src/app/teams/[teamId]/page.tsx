import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamHomeClient } from "./TeamHomeClient";
import { hasHostPrivilege } from "@/types";

export default async function TeamHomePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ロール取得
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  const isHost = hasHostPrivilege(membership?.role ?? "guest");

  // メンバー数
  const { count: memberCount } = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);

  // 次回日程（出欠つき）
  const now = new Date().toISOString();
  const { data: nextSchedule } = await supabase
    .from("schedules")
    .select("*, attendances(id, schedule_id, user_id, status, comment, updated_at, created_at)")
    .eq("team_id", teamId)
    .gte("date", now)
    .order("date", { ascending: true })
    .limit(1)
    .single();

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
