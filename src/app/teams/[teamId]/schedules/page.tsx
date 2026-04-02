import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScheduleListClient } from "./ScheduleListClient";

export default async function SchedulesPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // メンバー情報を取得（権限確認とメンバー数取得）
  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/teams");

  // チームの全メンバー数を取得
  const { count: totalMembers } = await supabase
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId);

  // 全日程と出欠を取得
  const { data: schedules } = await supabase
    .from("schedules")
    .select("*, attendances(*)")
    .eq("team_id", teamId)
    .order("date", { ascending: true });

  return (
    <ScheduleListClient
      teamId={teamId}
      schedules={schedules || []}
      totalMembers={totalMembers || 0}
      userId={user.id}
      isHost={member.role === "host"}
    />
  );
}
