import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 日程作成（ホストのみ。RLS ポリシーで is_team_host チェック）
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { teamId, date, endDate, location, note, capacity, deadline, creatorStatus, creatorComment } = await request.json();

    const { data: schedule, error } = await supabase
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
      const status = error.code === "42501" ? 403 : 500;
      return NextResponse.json(
        { error: error.code === "42501" ? "ホスト権限が必要です" : "日程の作成に失敗しました", detail: error.message },
        { status }
      );
    }

    // 作成者自身の出欠回答を同時に登録（デフォルト「参加」）。回答忘れ防止。
    const validStatuses = ["attend", "absent", "tentative"] as const;
    const initialStatus = validStatuses.includes(creatorStatus) ? creatorStatus : "attend";
    const { error: attErr } = await supabase
      .from("attendances")
      .insert({
        schedule_id: schedule.id,
        user_id: user.id,
        status: initialStatus,
        comment: creatorComment || null,
      });
    if (attErr) {
      // 出欠側が失敗しても日程作成自体は成功扱い。詳細はログだけに残す。
      console.error("schedules POST creator attendance insert error:", attErr);
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

    const { scheduleId, date, endDate, location, note, capacity, deadline } = await request.json();

    const { data: schedule, error } = await supabase
      .from("schedules")
      .update({
        date,
        end_date: endDate || null,
        location,
        note: note || null,
        capacity: capacity ?? null,
        deadline: deadline || null,
      })
      .eq("id", scheduleId)
      .select()
      .single();

    if (error) {
      console.error("schedules PUT update error:", error);
      const status = error.code === "42501" ? 403 : 500;
      return NextResponse.json(
        { error: error.code === "42501" ? "ホスト権限が必要です" : "日程の更新に失敗しました", detail: error.message },
        { status }
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

    const { scheduleId } = await request.json();

    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("id", scheduleId);

    if (error) {
      console.error("schedules DELETE delete error:", error);
      const status = error.code === "42501" ? 403 : 500;
      return NextResponse.json(
        { error: error.code === "42501" ? "ホスト権限が必要です" : "日程の削除に失敗しました", detail: error.message },
        { status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("schedules DELETE server error:", e);
    return NextResponse.json({ error: "サーバーエラー", detail: String(e) }, { status: 500 });
  }
}
