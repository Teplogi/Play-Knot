import { createClient } from "@/lib/supabase/server";
import { requireUser, getTeamMembership } from "@/lib/auth";
import { DivideClient } from "./DivideClient";
import { hasHostPrivilege } from "@/types";
import type { Member } from "@/lib/divide/algorithm";
import type { NgPair } from "@/types";

export default async function DividePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  await requireUser();
  const supabase = await createClient();

  // ロール / メンバー / 次回日程 / NGペアを並列取得
  const now = new Date().toISOString();
  const [membership, rawMembersRes, nextScheduleRes, rawNgPairsRes] = await Promise.all([
    getTeamMembership(teamId),
    supabase
      .from("team_members")
      .select("user_id, gender, users(name, gender)")
      .eq("team_id", teamId),
    supabase
      .from("schedules")
      .select("id, attendances(user_id, status)")
      .eq("team_id", teamId)
      .gte("date", now)
      .order("date", { ascending: true })
      .limit(1)
      .single(),
    supabase.from("ng_pairs").select("*").eq("team_id", teamId),
  ]);

  const isHost = hasHostPrivilege(membership?.role ?? "guest");

  const registeredMembers: Member[] = (rawMembersRes.data ?? []).map((m) => {
    const u = m.users as unknown as { name: string; gender: string } | null;
    // users.gender（アカウント設定）を優先、未設定ならteam_members.genderにフォールバック
    const gender = (u?.gender && u.gender !== "未設定" ? u.gender : m.gender) as "男" | "女" | "未設定";
    return {
      id: m.user_id,
      name: u?.name ?? "不明",
      gender,
    };
  });

  const attendingIds = (nextScheduleRes.data?.attendances ?? [])
    .filter((a: { status: string }) => a.status === "attend")
    .map((a: { user_id: string }) => a.user_id);

  const rawNgPairs = rawNgPairsRes.data;

  return (
    <DivideClient
      registeredMembers={registeredMembers}
      attendingIds={attendingIds}
      ngPairs={(rawNgPairs ?? []) as NgPair[]}
      isHost={isHost}
    />
  );
}
