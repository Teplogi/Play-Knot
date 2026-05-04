import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function verifyHostPrivilegeForGuest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  guestId: string,
  userId: string
): Promise<{ teamId: string } | null> {
  const { data: guest } = await supabase
    .from("team_guests")
    .select("team_id")
    .eq("id", guestId)
    .single();
  if (!guest) return null;

  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", guest.team_id)
    .eq("user_id", userId)
    .single();
  if (member?.role !== "host" && member?.role !== "co_host") return null;
  return { teamId: guest.team_id };
}

const ALLOWED_GENDERS = ["男", "女", "未設定"] as const;
type Gender = (typeof ALLOWED_GENDERS)[number];

// 助っ人編集
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ guestId: string }> }
) {
  try {
    const { guestId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

    const allowed = await verifyHostPrivilegeForGuest(supabase, guestId, user.id);
    if (!allowed) {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    const body = await request.json();
    const updates: { name?: string; gender?: Gender } = {};

    if (body.name !== undefined) {
      const trimmed = typeof body.name === "string" ? body.name.trim() : "";
      if (!trimmed) {
        return NextResponse.json({ error: "名前を入力してください" }, { status: 400 });
      }
      updates.name = trimmed;
    }

    if (body.gender !== undefined) {
      if (!ALLOWED_GENDERS.includes(body.gender)) {
        return NextResponse.json({ error: "性別が不正です" }, { status: 400 });
      }
      updates.gender = body.gender;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "更新内容がありません" }, { status: 400 });
    }

    const { data: guest, error } = await supabase
      .from("team_guests")
      .update(updates)
      .eq("id", guestId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "助っ人の更新に失敗しました" }, { status: 500 });
    }

    return NextResponse.json(guest);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// 助っ人削除
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ guestId: string }> }
) {
  try {
    const { guestId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

    const allowed = await verifyHostPrivilegeForGuest(supabase, guestId, user.id);
    if (!allowed) {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    const { error } = await supabase
      .from("team_guests")
      .delete()
      .eq("id", guestId);

    if (error) {
      return NextResponse.json({ error: "助っ人の削除に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
