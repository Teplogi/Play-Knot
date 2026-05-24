import { createClient } from "@/lib/supabase/server";
import { requireUser, getTeamMembership } from "@/lib/auth";
import { DivideClient, type FutureSchedule, type BindableSchedule } from "./DivideClient";
import { hasHostPrivilege } from "@/types";
import type { Member } from "@/lib/divide/algorithm";
import type { MustPair, NgPair, TeamGuest } from "@/types";

// Vercel サーバは UTC のため、JST の「今日 00:00」を UTC ISO で返す
function startOfTodayJSTAsUTC(): string {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${ymd}T00:00:00+09:00`).toISOString();
}

// 保存ダイアログでバインド可能な日程の上限。直近の過去 60 日 + 未来全てを対象にする。
const BINDABLE_PAST_DAYS = 60;

function bindablePastStartISO(): string {
  return new Date(Date.now() - BINDABLE_PAST_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export default async function DividePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  await requireUser();
  const supabase = await createClient();

  const todayStart = startOfTodayJSTAsUTC();
  const pastStart = bindablePastStartISO();
  const [
    membership,
    rawMembersRes,
    futureSchedulesRes,
    bindableSchedulesRes,
    savedDivisionsRes,
    rawNgPairsRes,
    rawMustPairsRes,
    teamSettingsRes,
    teamGuestsRes,
  ] = await Promise.all([
    getTeamMembership(teamId),
    supabase
      .from("team_members")
      .select("user_id, gender, users(name, gender)")
      .eq("team_id", teamId),
    supabase
      .from("schedules")
      .select(
        "id, date, location, attendances(user_id, status), schedule_guests(guest_id)"
      )
      .eq("team_id", teamId)
      .gte("date", todayStart)
      .order("date", { ascending: true }),
    // 保存ダイアログ用: 過去 60 日 + 未来全て (軽量カラムのみ)
    supabase
      .from("schedules")
      .select("id, date, location")
      .eq("team_id", teamId)
      .gte("date", pastStart)
      .order("date", { ascending: false }),
    // 既に保存済みの日程 ID を取得し、ダイアログで「保存済み」バッジを出す
    supabase
      .from("saved_team_divisions")
      .select("schedule_id")
      .eq("team_id", teamId),
    supabase.from("ng_pairs").select("*").eq("team_id", teamId),
    supabase.from("must_pairs").select("*").eq("team_id", teamId),
    supabase
      .from("team_settings")
      .select("default_divide_by, default_divide_value, default_divide_method")
      .eq("team_id", teamId)
      .single(),
    supabase
      .from("team_guests")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true }),
  ]);

  const defaults = {
    divideBy:
      (teamSettingsRes.data?.default_divide_by as "team_count" | "members_per_team") ??
      "team_count",
    divideValue: teamSettingsRes.data?.default_divide_value ?? 2,
    divideMethod:
      (teamSettingsRes.data?.default_divide_method as "random" | "gender_equal") ?? "random",
  };

  const isHost = hasHostPrivilege(membership?.role ?? "guest");

  const registeredMembers: Member[] = (rawMembersRes.data ?? []).map((m) => {
    const u = m.users as unknown as { name: string; gender: string } | null;
    const gender = (u?.gender && u.gender !== "未設定" ? u.gender : m.gender) as
      | "男"
      | "女"
      | "未設定";
    return {
      id: m.user_id,
      name: u?.name ?? "不明",
      gender,
    };
  });

  const teamGuests: TeamGuest[] = (teamGuestsRes.data ?? []) as TeamGuest[];

  const futureSchedules: FutureSchedule[] = (futureSchedulesRes.data ?? []).map((s) => ({
    id: s.id as string,
    date: s.date as string,
    location: (s.location as string | null) ?? null,
    attendingIds: (s.attendances ?? [])
      .filter((a: { status: string }) => a.status === "attend")
      .map((a: { user_id: string }) => a.user_id),
    invitedGuestIds: (s.schedule_guests ?? []).map((g: { guest_id: string }) => g.guest_id),
  }));

  const savedScheduleIds = new Set(
    (savedDivisionsRes.data ?? []).map((r: { schedule_id: string }) => r.schedule_id)
  );
  const bindableSchedules: BindableSchedule[] = (bindableSchedulesRes.data ?? []).map((s) => ({
    id: s.id as string,
    date: s.date as string,
    location: (s.location as string | null) ?? null,
    hasSaved: savedScheduleIds.has(s.id as string),
  }));

  return (
    <DivideClient
      registeredMembers={registeredMembers}
      teamGuests={teamGuests}
      futureSchedules={futureSchedules}
      bindableSchedules={bindableSchedules}
      ngPairs={(rawNgPairsRes.data ?? []) as NgPair[]}
      mustPairs={(rawMustPairsRes.data ?? []) as MustPair[]}
      isHost={isHost}
      defaults={defaults}
    />
  );
}
