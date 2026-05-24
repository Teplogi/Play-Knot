import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SavedTeamDivisionMember } from "@/types";

type IncomingTeam = SavedTeamDivisionMember[];

/**
 * 日程に対するチーム分け結果を upsert する。
 * UNIQUE(schedule_id) で 1 日程あたり 1 件しか持たないため、
 * onConflict: schedule_id で上書き保存する。
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

    const body = await request.json();
    const { scheduleId, teams, method, divideBy, divideValue } = body as {
      scheduleId?: string;
      teams?: IncomingTeam[];
      method?: string;
      divideBy?: string;
      divideValue?: number;
    };

    if (!scheduleId || !Array.isArray(teams) || teams.length === 0) {
      return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
    }
    if (method !== "random" && method !== "gender_equal") {
      return NextResponse.json({ error: "method が不正です" }, { status: 400 });
    }
    if (divideBy !== "team_count" && divideBy !== "members_per_team") {
      return NextResponse.json({ error: "divideBy が不正です" }, { status: 400 });
    }
    if (typeof divideValue !== "number" || divideValue < 1) {
      return NextResponse.json({ error: "divideValue が不正です" }, { status: 400 });
    }

    // 構造のサニタイズ：余計なフィールドを落として ID/name/gender/isDummy のみ保存
    const cleanTeams: SavedTeamDivisionMember[][] = teams.map((team) =>
      (team ?? [])
        .filter((m): m is SavedTeamDivisionMember => !!m && typeof m.id === "string" && typeof m.name === "string")
        .map((m) => ({
          id: m.id,
          name: m.name,
          gender: m.gender === "男" || m.gender === "女" ? m.gender : "未設定",
          ...(m.isDummy ? { isDummy: true as const } : {}),
        }))
    );

    if (cleanTeams.every((t) => t.length === 0)) {
      return NextResponse.json({ error: "メンバーが含まれていません" }, { status: 400 });
    }

    // schedule の team_id を取得し、書き込み権限チェック
    const { data: scheduleRow } = await supabase
      .from("schedules")
      .select("team_id")
      .eq("id", scheduleId)
      .single();
    if (!scheduleRow) {
      return NextResponse.json({ error: "日程が見つかりません" }, { status: 404 });
    }
    const teamId = scheduleRow.team_id as string;

    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();
    if (member?.role !== "host" && member?.role !== "co_host") {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    const { data: row, error } = await supabase
      .from("saved_team_divisions")
      .upsert(
        {
          schedule_id: scheduleId,
          team_id: teamId,
          teams: cleanTeams,
          method,
          divide_by: divideBy,
          divide_value: divideValue,
          created_by: user.id,
        },
        { onConflict: "schedule_id" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "保存に失敗しました", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json(
      { error: "サーバーエラー", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

/**
 * 日程に紐づくチーム分け結果を削除する。
 * クエリ ?scheduleId=... で削除対象を指定する。
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("scheduleId");
    if (!scheduleId) {
      return NextResponse.json({ error: "scheduleId が必要です" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

    const { data: scheduleRow } = await supabase
      .from("schedules")
      .select("team_id")
      .eq("id", scheduleId)
      .single();
    if (!scheduleRow) {
      return NextResponse.json({ error: "日程が見つかりません" }, { status: 404 });
    }

    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", scheduleRow.team_id)
      .eq("user_id", user.id)
      .single();
    if (member?.role !== "host" && member?.role !== "co_host") {
      return NextResponse.json({ error: "ホスト権限が必要です" }, { status: 403 });
    }

    const { error } = await supabase
      .from("saved_team_divisions")
      .delete()
      .eq("schedule_id", scheduleId);

    if (error) {
      return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
