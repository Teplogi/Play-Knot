import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeamsClient } from "./TeamsClient";

export default async function TeamsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

  // 所属チーム一覧取得
  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id, role, teams(id, name, created_at)")
    .eq("user_id", user.id);

  const teams = (memberships || []).map((m) => {
    const team = m.teams as unknown as { id: string; name: string; created_at: string };
    return { ...team, role: m.role };
  });

  return <TeamsClient userName={userData?.name || ""} teams={teams} />;
}
