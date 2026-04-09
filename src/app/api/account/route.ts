import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// アカウント情報更新
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { name, gender, birth_year, position } = await request.json();

    const { error } = await supabase
      .from("users")
      .update({ name, gender, birth_year, position })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
