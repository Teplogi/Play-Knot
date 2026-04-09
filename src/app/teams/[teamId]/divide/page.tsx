import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const isHost = hasHostPrivilege(membership?.role ?? "guest");

  // メンバー一覧（gender は team_members から取得）
  const { data: rawMembers } = await supabase
    .from("team_members")
    .select("user_id, gender, users(name)")
    .eq("team_id", teamId);

  const registeredMembers: Member[] = (rawMembers ?? []).map((m) => ({
    id: m.user_id,
    name: (m.users as unknown as { name: string })?.name ?? "不明",
    gender: m.gender as "男" | "女" | "未設定",
  }));

  // 次回日程の参加者ID一覧（自動選択用）
  const now = new Date().toISOString();
  const { data: nextSchedule } = await supabase
    .from("schedules")
    .select("id, attendances(user_id, status)")
    .eq("team_id", teamId)
    .gte("date", now)
    .order("date", { ascending: true })
    .limit(1)
    .single();

  const attendingIds = (nextSchedule?.attendances ?? [])
    .filter((a: { status: string }) => a.status === "attend")
    .map((a: { user_id: string }) => a.user_id);

  // NGペア
  const { data: rawNgPairs } = await supabase
    .from("ng_pairs")
    .select("*")
    .eq("team_id", teamId);

  return (
    <DivideClient
      registeredMembers={registeredMembers}
      attendingIds={attendingIds}
      ngPairs={(rawNgPairs ?? []) as NgPair[]}
      isHost={isHost}
    />
  );
}
