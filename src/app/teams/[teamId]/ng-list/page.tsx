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

  const [rawNgPairsRes, rawMustPairsRes, rawMembersRes] = await Promise.all([
    supabase
      .from("ng_pairs")
      .select(
        "id, team_id, user_id_a, user_id_b, created_at, user_a:users!ng_pairs_user_id_a_fkey(id, name), user_b:users!ng_pairs_user_id_b_fkey(id, name)"
      )
      .eq("team_id", teamId)
      .order("created_at", { ascending: false }),
    supabase
      .from("must_pairs")
      .select(
        "id, team_id, user_id_a, user_id_b, created_at, user_a:users!must_pairs_user_id_a_fkey(id, name), user_b:users!must_pairs_user_id_b_fkey(id, name)"
      )
      .eq("team_id", teamId)
      .order("created_at", { ascending: false }),
    supabase.from("team_members").select("users(id, name)").eq("team_id", teamId),
  ]);

  const ngPairs = (rawNgPairsRes.data ?? []).map((p) => ({
    id: p.id as string,
    team_id: p.team_id as string,
    user_id_a: p.user_id_a as string,
    user_id_b: p.user_id_b as string,
    created_at: p.created_at as string,
    user_a: p.user_a as unknown as { id: string; name: string },
    user_b: p.user_b as unknown as { id: string; name: string },
  }));

  const mustPairs = (rawMustPairsRes.data ?? []).map((p) => ({
    id: p.id as string,
    team_id: p.team_id as string,
    user_id_a: p.user_id_a as string,
    user_id_b: p.user_id_b as string,
    created_at: p.created_at as string,
    user_a: p.user_a as unknown as { id: string; name: string },
    user_b: p.user_b as unknown as { id: string; name: string },
  }));

  // 矛盾検出: 同一ペア (user_id_a, user_id_b) が NG と Must の両方に存在
  // (両テーブルとも user_id_a < user_id_b で正規化済み)
  const mustKey = new Set(mustPairs.map((p) => `${p.user_id_a}__${p.user_id_b}`));
  const conflicts = ngPairs
    .filter((p) => mustKey.has(`${p.user_id_a}__${p.user_id_b}`))
    .map((p) => ({
      user_a: p.user_a,
      user_b: p.user_b,
    }));

  const members = (rawMembersRes.data ?? []).map((m) => {
    const u = m.users as unknown as { id: string; name: string };
    return { id: u.id, name: u.name };
  });

  return (
    <NgListClient
      teamId={teamId}
      initialNgPairs={ngPairs}
      initialMustPairs={mustPairs}
      conflicts={conflicts}
      members={members}
    />
  );
}
