import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DivideClient } from "./DivideClient";
import type { Member } from "@/lib/divide/algorithm";
import type { NgPair } from "@/types";

export default async function DividePage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ scheduleId?: string }>;
}) {
  const { teamId } = await params;
  const { scheduleId } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // メンバー情報取得
  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/teams");

  const isHost = member.role === "host";

  // 全チームメンバーをユーザー情報付きで取得
  const { data: teamMembers } = await supabase
    .from("team_members")
    .select("user_id, gender, users(id, name)")
    .eq("team_id", teamId);

  const registeredMembers: Member[] = (teamMembers || []).map((tm) => {
    const u = tm.users as unknown as { id: string; name: string };
    return {
      id: u.id,
      name: u.name,
      gender: tm.gender as "男" | "女" | "未設定",
    };
  });

  // 出欠データがある場合、出席者のIDリストを取得
  let attendingIds: string[] = [];
  if (scheduleId) {
    const { data: attendances } = await supabase
      .from("attendances")
      .select("user_id")
      .eq("schedule_id", scheduleId)
      .eq("status", "attend");

    attendingIds = (attendances || []).map((a) => a.user_id);
  }

  // NGペア取得（ホストのみ。RLSでゲストには返らないが明示的に分ける）
  let ngPairs: NgPair[] = [];
  if (isHost) {
    const { data: ngData } = await supabase
      .from("ng_pairs")
      .select("user_id_a, user_id_b")
      .eq("team_id", teamId);

    ngPairs = (ngData || []) as NgPair[];
  }

  return (
    <DivideClient
      registeredMembers={registeredMembers}
      attendingIds={attendingIds}
      ngPairs={ngPairs}
      isHost={isHost}
    />
  );
}
