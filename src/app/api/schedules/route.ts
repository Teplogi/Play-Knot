import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// 日程作成（ホストのみ）
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { teamId, date, endDate, location, note, capacity, deadline } = await request.json();

    // ホスト権限チェック（RLS再帰回避のため service_role を使用）
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: member, error: memberError } = await admin
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      console.error("schedules POST member check error:", memberError);
      return NextResponse.json(
        { error: "メンバー情報の取得に失敗しました", detail: memberError?.message },
        { status: 403 }
      );
    }

    if (member.role !== "host" && member.role !== "co_host") {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    // RLSバイパスでinsert
    const { data: schedule, error } = await admin
      .from("schedules")
      .insert({
        team_id: teamId,
        date,
        end_date: endDate || null,
        location,
        note: note || null,
        capacity: capacity ?? null,
        deadline: deadline || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("schedules POST insert error:", error);
      return NextResponse.json(
        { error: "日程の作成に失敗しました", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(schedule);
  } catch (e) {
    console.error("schedules POST server error:", e);
    return NextResponse.json({ error: "サーバーエラー", detail: String(e) }, { status: 500 });
  }
}

// 日程更新（ホストのみ）
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { scheduleId, teamId, date, endDate, location, note, capacity, deadline } = await request.json();

    // ホスト権限チェック（RLS再帰回避のため service_role を使用）
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: member, error: memberError } = await admin
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      console.error("schedules PUT member check error:", memberError);
      return NextResponse.json(
        { error: "メンバー情報の取得に失敗しました", detail: memberError?.message },
        { status: 403 }
      );
    }

    if (member.role !== "host" && member.role !== "co_host") {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    const { data: schedule, error } = await admin
      .from("schedules")
      .update({ date, end_date: endDate || null, location, note: note || null, capacity: capacity ?? null, deadline: deadline || null })
      .eq("id", scheduleId)
      .select()
      .single();

    if (error) {
      console.error("schedules PUT update error:", error);
      return NextResponse.json(
        { error: "日程の更新に失敗しました", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(schedule);
  } catch (e) {
    console.error("schedules PUT server error:", e);
    return NextResponse.json({ error: "サーバーエラー", detail: String(e) }, { status: 500 });
  }
}

// 日程削除（ホストのみ）
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { scheduleId, teamId } = await request.json();

    // ホスト権限チェック（RLS再帰回避のため service_role を使用）
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: member, error: memberError } = await admin
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      console.error("schedules DELETE member check error:", memberError);
      return NextResponse.json(
        { error: "メンバー情報の取得に失敗しました", detail: memberError?.message },
        { status: 403 }
      );
    }

    if (member.role !== "host" && member.role !== "co_host") {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    const { error } = await admin
      .from("schedules")
      .delete()
      .eq("id", scheduleId);

    if (error) {
      console.error("schedules DELETE delete error:", error);
      return NextResponse.json(
        { error: "日程の削除に失敗しました", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("schedules DELETE server error:", e);
    return NextResponse.json({ error: "サーバーエラー", detail: String(e) }, { status: 500 });
  }
}
