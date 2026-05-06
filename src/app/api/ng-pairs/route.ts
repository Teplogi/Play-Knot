import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function verifyHostPrivilege(supabase: Awaited<ReturnType<typeof createClient>>, teamId: string, userId: string) {
  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .single();
  return member?.role === "host" || member?.role === "co_host";
}

// 当該チームのメンバー (users) と助っ人 (team_guests) を id をキーに
// マージした名前マップを返す。NGペアの user_id_a / user_id_b は両者の
// どちらかを指しうるため (022 マイグレーション以降)、表示・検証で利用する。
async function loadTeamParticipantNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string
): Promise<Map<string, { id: string; name: string }>> {
  const map = new Map<string, { id: string; name: string }>();
  const [memberRes, guestRes] = await Promise.all([
    supabase.from("team_members").select("users(id, name)").eq("team_id", teamId),
    supabase.from("team_guests").select("id, name").eq("team_id", teamId),
  ]);
  for (const row of memberRes.data ?? []) {
    const u = row.users as unknown as { id: string; name: string } | null;
    if (u) map.set(u.id, { id: u.id, name: u.name });
  }
  for (const g of guestRes.data ?? []) {
    map.set(g.id as string, { id: g.id as string, name: g.name as string });
  }
  return map;
}

// NGリスト取得
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "チームIDが必要です" }, { status: 400 });

    if (!(await verifyHostPrivilege(supabase, teamId, user.id))) {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    const { data: pairs, error } = await supabase
      .from("ng_pairs")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "チーム分け条件の取得に失敗しました" }, { status: 500 });

    // user_id_a / user_id_b は users.id か team_guests.id のいずれか。
    // 双方をまとめて引いて名前を埋める。
    const nameMap = await loadTeamParticipantNames(supabase, teamId);
    const resolve = (id: string) => nameMap.get(id) ?? { id, name: "不明" };
    const enriched = (pairs ?? []).map((p) => ({
      ...p,
      user_a: resolve(p.user_id_a),
      user_b: resolve(p.user_id_b),
    }));

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// NG追加
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

    const { teamId, userIdA, userIdB } = await request.json();
    if (!teamId || !userIdA || !userIdB) {
      return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
    }

    if (userIdA === userIdB) {
      return NextResponse.json({ error: "同じメンバーは選択できません" }, { status: 400 });
    }

    if (!(await verifyHostPrivilege(supabase, teamId, user.id))) {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    // 与えられた id がこのチームのメンバー / 助っ人として存在するかを検証
    const nameMap = await loadTeamParticipantNames(supabase, teamId);
    if (!nameMap.has(userIdA) || !nameMap.has(userIdB)) {
      return NextResponse.json(
        { error: "選択したメンバーがチームに存在しません" },
        { status: 400 }
      );
    }

    // ID順に並び替え（重複防止）
    const [sortedA, sortedB] = userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];

    // 既存チェック
    const { data: existing } = await supabase
      .from("ng_pairs")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id_a", sortedA)
      .eq("user_id_b", sortedB)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "この組み合わせは既に登録されています" }, { status: 409 });
    }

    // 「必ずペア」と矛盾していないか
    const { data: mustExisting } = await supabase
      .from("must_pairs")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id_a", sortedA)
      .eq("user_id_b", sortedB)
      .maybeSingle();

    if (mustExisting) {
      return NextResponse.json(
        { error: "このペアは「必ず同じチーム」にも登録されています。先に解除してください" },
        { status: 409 }
      );
    }

    const { data: pair, error } = await supabase
      .from("ng_pairs")
      .insert({
        team_id: teamId,
        user_id_a: sortedA,
        user_id_b: sortedB,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "ペアの追加に失敗しました" }, { status: 500 });

    return NextResponse.json(pair);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
