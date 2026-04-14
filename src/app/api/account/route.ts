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

    const { name, gender, birth_year, position, notification_email } = await request.json();

    // 簡易バリデーション: 空文字は NULL として扱う
    let notif: string | null | undefined = undefined;
    if (notification_email !== undefined) {
      const trimmed = typeof notification_email === "string" ? notification_email.trim() : "";
      if (trimmed === "") {
        notif = null;
      } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
        return NextResponse.json({ error: "メールアドレスの形式が不正です" }, { status: 400 });
      } else {
        notif = trimmed;
      }
    }

    const update: Record<string, unknown> = { name, gender, birth_year, position };
    if (notif !== undefined) update.notification_email = notif;

    const { error } = await supabase
      .from("users")
      .update(update)
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
