import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { NgListClient } from "./NgListClient";

export default async function NgListPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  await requireUser();
  const supabase = await createClient();

  // NGペア / メンバー を並列取得
  const [rawPairsRes, rawMembersRes] = await Promise.all([
    supabase
      .from("ng_pairs")
      .select("id, team_id, created_at, user_a:users!ng_pairs_user_id_a_fkey(id, name), user_b:users!ng_pairs_user_id_b_fkey(id, name)")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false }),
    supabase.from("team_members").select("users(id, name)").eq("team_id", teamId),
  ]);

  const pairs = (rawPairsRes.data ?? []).map((p) => ({
    id: p.id,
    team_id: p.team_id,
    created_at: p.created_at,
    user_a: p.user_a as unknown as { id: string; name: string },
    user_b: p.user_b as unknown as { id: string; name: string },
  }));

  const members = (rawMembersRes.data ?? []).map((m) => {
    const u = m.users as unknown as { id: string; name: string };
    return { id: u.id, name: u.name };
  });

  return <NgListClient teamId={teamId} initialPairs={pairs} members={members} />;
}
