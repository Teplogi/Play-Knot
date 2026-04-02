import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NgListClient } from "./NgListClient";

export default async function NgListPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ホスト権限チェック
  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (!member || member.role !== "host") redirect(`/teams/${teamId}`);

  // NGペア一覧取得（ユーザー名付き）
  const { data: pairs } = await supabase
    .from("ng_pairs")
    .select("*, user_a:users!ng_pairs_user_id_a_fkey(id, name), user_b:users!ng_pairs_user_id_b_fkey(id, name)")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  // メンバー一覧取得（フォーム用）
  const { data: teamMembers } = await supabase
    .from("team_members")
    .select("users(id, name)")
    .eq("team_id", teamId);

  const memberUsers = (teamMembers || []).map(
    (tm) => tm.users as unknown as { id: string; name: string }
  );

  return (
    <NgListClient
      teamId={teamId}
      initialPairs={pairs || []}
      members={memberUsers}
    />
  );
}
