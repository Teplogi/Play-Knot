import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function verifyHostPrivilege(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
  userId: string
) {
  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .single();
  return member?.role === "host" || member?.role === "co_host";
}

// 必ずペア一覧
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
      .from("must_pairs")
      .select(
        "*, user_a:users!must_pairs_user_id_a_fkey(id, name), user_b:users!must_pairs_user_id_b_fkey(id, name)"
      )
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "必ずペアの取得に失敗しました" }, { status: 500 });
    }

    return NextResponse.json(pairs);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// 必ずペア追加
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

    const [sortedA, sortedB] = userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];

    // (1) NG ペアと矛盾していないか
    const { data: ngExisting } = await supabase
      .from("ng_pairs")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id_a", sortedA)
      .eq("user_id_b", sortedB)
      .maybeSingle();
    if (ngExisting) {
      return NextResponse.json(
        { error: "このペアはNGペアにも登録されています。先に解除してください" },
        { status: 409 }
      );
    }

    // (2) chain 防止: どちらかが既に他の must_pair に居れば弾く
    const { data: chainConflict } = await supabase
      .from("must_pairs")
      .select("id, user_id_a, user_id_b")
      .eq("team_id", teamId)
      .or(
        `user_id_a.eq.${sortedA},user_id_b.eq.${sortedA},user_id_a.eq.${sortedB},user_id_b.eq.${sortedB}`
      );
    if (chainConflict && chainConflict.length > 0) {
      return NextResponse.json(
        {
          error:
            "選択したメンバーは既に別の「必ずペア」に登録されています。先に解除してください",
        },
        { status: 409 }
      );
    }

    const { data: pair, error } = await supabase
      .from("must_pairs")
      .insert({
        team_id: teamId,
        user_id_a: sortedA,
        user_id_b: sortedB,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "この組み合わせは既に登録されています" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "ペアの追加に失敗しました" }, { status: 500 });
    }

    return NextResponse.json(pair);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
