import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient, type TeamSettings, type InviteLink, type NotificationPref, type AccountSettings } from "./SettingsClient";
import type { TeamRole } from "@/types";

export default async function SettingsPage({
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

  const role = (membership?.role ?? "guest") as TeamRole;

  // チーム情報
  const { data: team } = await supabase
    .from("teams")
    .select("name, sport_type, icon_color")
    .eq("id", teamId)
    .single();

  // チーム設定（日程デフォルト等）
  const { data: teamSettings } = await supabase
    .from("team_settings")
    .select("*")
    .eq("team_id", teamId)
    .single();

  const initialSettings: TeamSettings = {
    name: team?.name ?? "",
    description: "",
    sportType: team?.sport_type ?? "",
    iconColor: team?.icon_color ?? "indigo",
    defaultExpirationDays: 7,
    defaultLocations: teamSettings?.default_locations ?? [],
    defaultStartTime: teamSettings?.default_start_time ?? "19:00",
    defaultEndTime: teamSettings?.default_end_time ?? "21:00",
    attendanceDeadlineHoursBefore: teamSettings?.attendance_deadline_hours_before ?? 1,
    defaultDivideBy: (teamSettings?.default_divide_by as "team_count" | "members_per_team") ?? "team_count",
    defaultDivideValue: teamSettings?.default_divide_value ?? 2,
    defaultDivideMethod: (teamSettings?.default_divide_method as "random" | "gender_equal") ?? "random",
    autoSelectAttendees: teamSettings?.auto_select_attendees ?? true,
  };

  // 招待リンク
  const { data: rawInvites } = await supabase
    .from("invite_tokens")
    .select("id, token, created_at, expires_at, used_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  const now = new Date();
  const initialInvites: InviteLink[] = (rawInvites ?? []).map((inv) => ({
    id: inv.id,
    token: inv.token,
    createdAt: inv.created_at,
    expiresAt: inv.expires_at,
    usedAt: inv.used_at,
    expired: inv.used_at !== null || new Date(inv.expires_at) < now,
  }));

  // メンバー一覧（譲渡用）
  const { data: rawMembers } = await supabase
    .from("team_members")
    .select("user_id, role, users(name)")
    .eq("team_id", teamId);

  const members = (rawMembers ?? []).map((m) => ({
    id: m.user_id,
    name: (m.users as unknown as { name: string })?.name ?? "不明",
    role: m.role as TeamRole,
  }));

  // 通知設定
  const { data: notifData } = await supabase
    .from("notification_preferences")
    .select("schedule_created, schedule_changed, reminder, deadline, reopened")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  const initialNotificationPrefs: NotificationPref = {
    schedule_created: notifData?.schedule_created ?? true,
    schedule_changed: notifData?.schedule_changed ?? true,
    reminder: notifData?.reminder ?? true,
    deadline: notifData?.deadline ?? true,
    reopened: notifData?.reopened ?? true,
  };

  // アカウント情報
  const { data: profile } = await supabase
    .from("users")
    .select("name, gender, birth_year, position")
    .eq("id", user.id)
    .single();

  const initialAccount: AccountSettings = {
    displayName: profile?.name ?? "",
    gender: (profile?.gender as "男" | "女" | "未設定") ?? "未設定",
    birthYear: profile?.birth_year ?? null,
    position: profile?.position ?? "",
    scheduleView: "list",
  };

  return (
    <SettingsClient
      teamId={teamId}
      role={role}
      initialSettings={initialSettings}
      initialInvites={initialInvites}
      members={members}
      initialNotificationPrefs={initialNotificationPrefs}
      initialAccount={initialAccount}
    />
  );
}
