import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 招待トークン削除
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { error } = await supabase
      .from("invite_tokens")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
