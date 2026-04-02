import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MembersClient } from "./MembersClient";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ホスト権限チェック
  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (!member || member.role !== "host") redirect(`/teams/${teamId}`);

  // メンバー一覧をユーザー情報付きで取得
  const { data: members } = await supabase
    .from("team_members")
    .select("*, users(id, name, email)")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });

  return <MembersClient teamId={teamId} initialMembers={members || []} />;
}
