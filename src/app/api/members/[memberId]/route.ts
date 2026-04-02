import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// メンバー更新
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

    const { teamId, role, gender } = await request.json();
    if (!teamId) return NextResponse.json({ error: "チームIDが必要です" }, { status: 400 });

    // ホスト権限チェック
    const { data: callerMember } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!callerMember || callerMember.role !== "host") {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    // 最後のホスト降格チェック
    if (role && role !== "host") {
      const { data: targetMember } = await supabase
        .from("team_members")
        .select("role")
        .eq("id", memberId)
        .single();

      if (targetMember?.role === "host") {
        const { count } = await supabase
          .from("team_members")
          .select("*", { count: "exact", head: true })
          .eq("team_id", teamId)
          .eq("role", "host");

        if ((count || 0) <= 1) {
          return NextResponse.json(
            { error: "最後のホストを降格することはできません" },
            { status: 400 }
          );
        }
      }
    }

    const updateData: Record<string, string> = {};
    if (role) updateData.role = role;
    if (gender) updateData.gender = gender;

    const { data: member, error } = await supabase
      .from("team_members")
      .update(updateData)
      .eq("id", memberId)
      .select("*, users(id, name, email)")
      .single();

    if (error) return NextResponse.json({ error: "メンバーの更新に失敗しました" }, { status: 500 });

    return NextResponse.json(member);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// メンバー削除
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

    const { teamId } = await request.json();
    if (!teamId) return NextResponse.json({ error: "チームIDが必要です" }, { status: 400 });

    // ホスト権限チェック
    const { data: callerMember } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!callerMember || callerMember.role !== "host") {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    // 最後のホスト削除チェック
    const { data: targetMember } = await supabase
      .from("team_members")
      .select("role")
      .eq("id", memberId)
      .single();

    if (targetMember?.role === "host") {
      const { count } = await supabase
        .from("team_members")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("role", "host");

      if ((count || 0) <= 1) {
        return NextResponse.json(
          { error: "最後のホストを削除することはできません" },
          { status: 400 }
        );
      }
    }

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", memberId);

    if (error) return NextResponse.json({ error: "メンバーの削除に失敗しました" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
