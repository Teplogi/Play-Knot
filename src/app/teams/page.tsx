import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { TeamsClient } from "./TeamsClient";

export default async function TeamsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // ユーザー情報（チーム新規作成権限フラグも取得）
  const { data: profile } = await supabase
    .from("users")
    .select("name, can_create_team")
    .eq("id", user.id)
    .single();

  // 所属チーム一覧（ロール・スポーツ種別・アイコン色つき）
  const { data: memberships } = await supabase
    .from("team_members")
    .select("role, teams(id, name, sport_type, icon_color, created_at)")
    .eq("user_id", user.id);


  const teams = (memberships ?? []).map((m) => {
    const t = m.teams as unknown as {
      id: string;
      name: string;
      sport_type: string;
      icon_color: string;
      created_at: string;
    };
    return {
      id: t.id,
      name: t.name,
      sportType: t.sport_type || "",
      iconColor: t.icon_color || "indigo",
      memberCount: 0, // 後で集計
      nextSchedule: null as string | null,
      created_at: t.created_at,
      role: m.role as string,
    };
  });

  // 各チームのメンバー数を取得
  for (const team of teams) {
    const { count } = await supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id);
    team.memberCount = count ?? 0;
  }

  // 各チームの次回日程を取得
  // Vercel サーバは UTC で動くため getHours() 等をそのまま使うと
  // 9 時間ずれる。Asia/Tokyo を明示的に指定して整形する。
  const now = new Date().toISOString();
  const jstFormat = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  for (const team of teams) {
    const { data: nextSched } = await supabase
      .from("schedules")
      .select("date")
      .eq("team_id", team.id)
      .gte("date", now)
      .order("date", { ascending: true })
      .limit(1)
      .single();
    if (nextSched) {
      const d = new Date(nextSched.date);
      const parts = jstFormat.formatToParts(d);
      const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
      const month = get("month");
      const day = get("day");
      const weekday = get("weekday");
      const hour = get("hour");
      const minute = get("minute");
      team.nextSchedule = `${month}/${day}（${weekday}）${hour}:${minute}`;
    }
  }

  return (
    <TeamsClient
      userName={profile?.name ?? ""}
      teams={teams}
      canCreateTeam={profile?.can_create_team ?? false}
    />
  );
}
