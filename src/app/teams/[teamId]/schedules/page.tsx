import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScheduleListClient } from "./ScheduleListClient";
import { hasHostPrivilege } from "@/types";

export default async function SchedulesPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
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

  // メンバー数
  const { count: totalMembers } = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);

  // 日程一覧（出欠つき）
  const { data: schedules } = await supabase
    .from("schedules")
    .select("*, attendances(id, schedule_id, user_id, status, comment, updated_at, created_at)")
    .eq("team_id", teamId)
    .order("date", { ascending: true });

  return (
    <ScheduleListClient
      teamId={teamId}
      schedules={schedules ?? []}
      totalMembers={totalMembers ?? 0}
      userId={user.id}
      canManageSchedule={canManageSchedule}
    />
  );
}
