import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  // NGペア一覧（ユーザー名つき）
  const { data: rawPairs } = await supabase
    .from("ng_pairs")
    .select("id, team_id, created_at, user_a:users!ng_pairs_user_id_a_fkey(id, name), user_b:users!ng_pairs_user_id_b_fkey(id, name)")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  const pairs = (rawPairs ?? []).map((p) => ({
    id: p.id,
    team_id: p.team_id,
    created_at: p.created_at,
    user_a: p.user_a as unknown as { id: string; name: string },
    user_b: p.user_b as unknown as { id: string; name: string },
  }));

  // メンバー一覧（ドロップダウン用）
  const { data: rawMembers } = await supabase
    .from("team_members")
    .select("users(id, name)")
    .eq("team_id", teamId);

  const members = (rawMembers ?? []).map((m) => {
    const u = m.users as unknown as { id: string; name: string };
    return { id: u.id, name: u.name };
  });

  return <NgListClient teamId={teamId} initialPairs={pairs} members={members} />;
}
