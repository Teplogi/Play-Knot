import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamsClient } from "./TeamsClient";

export default async function TeamsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ユーザー情報
  const { data: profile } = await supabase
    .from("users")
    .select("name")
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
  const now = new Date().toISOString();
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
      const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
      team.nextSchedule = `${d.getMonth() + 1}/${d.getDate()}（${weekdays[d.getDay()]}）${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
  }

  return <TeamsClient userName={profile?.name ?? ""} teams={teams} />;
}
