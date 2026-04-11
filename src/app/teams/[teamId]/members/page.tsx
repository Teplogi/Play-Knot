import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth";
import { MembersClient } from "./MembersClient";
import type { TeamMemberWithUser } from "@/types";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  await requireUser();

  // users テーブルの RLS は「自分のみ」のため、通常 client で
  // team_members + users を JOIN しても他メンバーの users 行が
  // NULL になり MemberList.tsx の member.users.name で crash する。
  // service_role で取得して RLS をバイパス。
  // members ページは layout 側で host/co_host 限定になっているため
  // 認可は既に担保されている。
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: members } = await admin
    .from("team_members")
    .select("*, users(id, name, email, gender, birth_year, position, created_at)")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });

  return <MembersClient teamId={teamId} initialMembers={(members ?? []) as TeamMemberWithUser[]} />;
}
