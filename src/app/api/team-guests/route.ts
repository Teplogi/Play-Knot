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

const ALLOWED_GENDERS = ["男", "女", "未設定"] as const;
type Gender = (typeof ALLOWED_GENDERS)[number];

function normalizeGender(value: unknown): Gender {
  return ALLOWED_GENDERS.includes(value as Gender) ? (value as Gender) : "未設定";
}

// 助っ人作成
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

    const { teamId, name, gender } = await request.json();
    if (!teamId) return NextResponse.json({ error: "チームIDが必要です" }, { status: 400 });

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      return NextResponse.json({ error: "名前を入力してください" }, { status: 400 });
    }

    if (!(await verifyHostPrivilege(supabase, teamId, user.id))) {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    const { data: guest, error } = await supabase
      .from("team_guests")
      .insert({
        team_id: teamId,
        name: trimmedName,
        gender: normalizeGender(gender),
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "助っ人の追加に失敗しました" }, { status: 500 });
    }

    return NextResponse.json(guest);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
