import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyCancellation, notifyReopened } from "@/lib/email/notify";

// 出欠の登録・更新（upsert）
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { scheduleId, status, comment } = await request.json();

    if (!scheduleId || !status) {
      return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
    }

    if (!["attend", "absent", "tentative"].includes(status)) {
      return NextResponse.json({ error: "無効なステータスです" }, { status: 400 });
    }

    // 既存の出欠レコードを確認（当日キャンセル検知用）
    const { data: existing } = await supabase
      .from("attendances")
      .select("id, status, created_at")
      .eq("schedule_id", scheduleId)
      .eq("user_id", user.id)
      .single();

    // 日程情報を取得（締切チェック・当日キャンセル判定用）
    const { data: schedule } = await supabase
      .from("schedules")
      .select("id, team_id, date, location, note, deadline, capacity")
      .eq("id", scheduleId)
      .single();

    if (!schedule) {
      return NextResponse.json({ error: "日程が見つかりません" }, { status: 404 });
    }

    // tentative を新たに選ぶには team_settings.allow_tentative が必要。
    // OFF でも既存の tentative を別ステータスへ切り替える操作は許可。
    if (status === "tentative") {
      const { data: ts } = await supabase
        .from("team_settings")
        .select("allow_tentative")
        .eq("team_id", schedule.team_id)
        .single();
      if (!ts?.allow_tentative) {
        return NextResponse.json(
          { error: "このチームでは「検討中」回答は無効です" },
          { status: 403 }
        );
      }
    }

    // 新規回答は締切後不可（既存の切り替えは許可）
    if (!existing && schedule.deadline && new Date() > new Date(schedule.deadline)) {
      return NextResponse.json(
        { error: "締切済みです。ホストに連絡してください" },
        { status: 403 }
      );
    }

    let isSamedayCancel = false;
    let wasAttendFlipToAbsent = false;

    if (existing) {
      // 当日キャンセル検知：参加→不参加に変更 かつ 練習日の当日0:00以降
      if (existing.status === "attend" && status === "absent") {
        wasAttendFlipToAbsent = true;
        const scheduleDate = new Date(schedule.date);
        const scheduleDayStart = new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate());
        const now = new Date();
        if (now >= scheduleDayStart) {
          isSamedayCancel = true;
        }
      }

      // 既存レコードを更新
      const { data: attendance, error } = await supabase
        .from("attendances")
        .update({
          status,
          comment: comment || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: "出欠の更新に失敗しました" }, { status: 500 });
      }

      // 通知トリガー（非同期・失敗してもレスポンスに影響しない）
      if (wasAttendFlipToAbsent) {
        sendCancellationNotifications(
          supabase,
          schedule,
          user.id,
          comment,
          isSamedayCancel
        ).catch((err) => console.error("キャンセル通知送信エラー:", err));
      }

      return NextResponse.json({ attendance, isSamedayCancel });
    }

    // 新規レコードを作成
    const { data: attendance, error } = await supabase
      .from("attendances")
      .insert({
        schedule_id: scheduleId,
        user_id: user.id,
        status,
        comment: comment || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "出欠の登録に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ attendance, isSamedayCancel: false });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// 参加→キャンセル時の通知: ホストへのキャンセル通知 + 満員解消なら再募集通知
async function sendCancellationNotifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  schedule: { id: string; team_id: string; date: string; location: string; note: string | null; capacity: number | null },
  cancellerUserId: string,
  comment: string | null,
  isSamedayCancel: boolean
) {
  const { data: team } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", schedule.team_id)
    .single();
  if (!team) return;

  const { data: cancelUser } = await supabase
    .from("users")
    .select("name")
    .eq("id", cancellerUserId)
    .single();

  // ホスト向けキャンセル通知は従来どおり。ただし preferences.cancellation を尊重。
  // ※ 仕様上「当日キャンセル」のみ既存では送っていたが、
  //   preferences で ON/OFF 選択できるようになったため、通常キャンセルでも送る。
  //   当日キャンセルは件名で区別不要 (テンプレート内で日時を明示済み)。
  await notifyCancellation(
    supabase,
    {
      id: schedule.id,
      team_id: schedule.team_id,
      date: schedule.date,
      location: schedule.location,
      note: schedule.note,
    },
    team,
    cancelUser?.name || "不明",
    comment,
    cancellerUserId
  );

  // 再募集通知: キャンセル前が満員だった場合のみ送信
  // (capacity が設定されていて、いま attend 数が capacity 未満になったとき)
  if (schedule.capacity) {
    const { count } = await supabase
      .from("attendances")
      .select("id", { count: "exact", head: true })
      .eq("schedule_id", schedule.id)
      .eq("status", "attend");
    const current = count ?? 0;
    // キャンセル直後 = capacity ちょうどだったところから1つ空いた状態
    if (current === schedule.capacity - 1) {
      await notifyReopened(
        supabase,
        {
          id: schedule.id,
          team_id: schedule.team_id,
          date: schedule.date,
          location: schedule.location,
          note: schedule.note,
        },
        team,
        cancellerUserId
      );
    }
  }

  // isSamedayCancel は将来的に件名差し替え等に使える。現状ログのみ。
  if (isSamedayCancel) {
    console.log("当日キャンセル通知送信:", schedule.id, cancellerUserId);
  }
}
