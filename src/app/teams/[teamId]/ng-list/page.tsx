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

  // ng_pairs / must_pairs の user_id_a / user_id_b は users.id か
  // team_guests.id のどちらか (022 マイグレーション以降)。FK ジョインが
  // 使えないので、両テーブルを別途引いて名前を合成する。
  const [rawNgPairsRes, rawMustPairsRes, rawMembersRes, rawGuestsRes] = await Promise.all([
    supabase
      .from("ng_pairs")
      .select("id, team_id, user_id_a, user_id_b, created_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false }),
    supabase
      .from("must_pairs")
      .select("id, team_id, user_id_a, user_id_b, created_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false }),
    supabase.from("team_members").select("users(id, name)").eq("team_id", teamId),
    supabase
      .from("team_guests")
      .select("id, name")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true }),
  ]);

  const memberOptions = (rawMembersRes.data ?? []).map((m) => {
    const u = m.users as unknown as { id: string; name: string };
    return { id: u.id, name: u.name, isGuest: false };
  });
  const guestOptions = (rawGuestsRes.data ?? []).map((g) => ({
    id: g.id as string,
    name: g.name as string,
    isGuest: true,
  }));
  const members = [...memberOptions, ...guestOptions];

  // 名前解決マップ。参照が消えたメンバー (削除済みなど) は「不明」扱い。
  const nameMap = new Map<string, { id: string; name: string }>();
  for (const m of members) nameMap.set(m.id, { id: m.id, name: m.name });
  const resolveUser = (id: string) => nameMap.get(id) ?? { id, name: "不明" };

  const ngPairs = (rawNgPairsRes.data ?? []).map((p) => ({
    id: p.id as string,
    team_id: p.team_id as string,
    user_id_a: p.user_id_a as string,
    user_id_b: p.user_id_b as string,
    created_at: p.created_at as string,
    user_a: resolveUser(p.user_id_a as string),
    user_b: resolveUser(p.user_id_b as string),
  }));

  const mustPairs = (rawMustPairsRes.data ?? []).map((p) => ({
    id: p.id as string,
    team_id: p.team_id as string,
    user_id_a: p.user_id_a as string,
    user_id_b: p.user_id_b as string,
    created_at: p.created_at as string,
    user_a: resolveUser(p.user_id_a as string),
    user_b: resolveUser(p.user_id_b as string),
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
