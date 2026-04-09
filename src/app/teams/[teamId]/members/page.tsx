// TODO: Supabase接続後に元のServer Component版に戻す
import { MembersClient } from "./MembersClient";
import type { TeamMemberWithUser } from "@/types";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  const mockMembers: TeamMemberWithUser[] = [
    { id: "m1", team_id: teamId, user_id: "u1", role: "host", gender: "男", created_at: "2024-01-15T00:00:00Z", users: { id: "u1", name: "田中太郎", email: "tanaka@example.com", gender: "未設定", birth_year: null, position: "", created_at: "" } },
    { id: "m2", team_id: teamId, user_id: "u2", role: "guest", gender: "女", created_at: "2024-02-01T00:00:00Z", users: { id: "u2", name: "佐藤花子", email: "sato@example.com", gender: "未設定", birth_year: null, position: "", created_at: "" } },
    { id: "m3", team_id: teamId, user_id: "u3", role: "guest", gender: "男", created_at: "2024-02-15T00:00:00Z", users: { id: "u3", name: "鈴木一郎", email: "suzuki@example.com", gender: "未設定", birth_year: null, position: "", created_at: "" } },
    { id: "m4", team_id: teamId, user_id: "u4", role: "guest", gender: "男", created_at: "2024-03-01T00:00:00Z", users: { id: "u4", name: "山田次郎", email: "yamada@example.com", gender: "未設定", birth_year: null, position: "", created_at: "" } },
    { id: "m5", team_id: teamId, user_id: "u5", role: "guest", gender: "女", created_at: "2024-03-10T00:00:00Z", users: { id: "u5", name: "高橋美咲", email: "takahashi@example.com", gender: "未設定", birth_year: null, position: "", created_at: "" } },
    { id: "m6", team_id: teamId, user_id: "u6", role: "guest", gender: "未設定", created_at: "2024-03-20T00:00:00Z", users: { id: "u6", name: "中村大輔", email: "nakamura@example.com", gender: "未設定", birth_year: null, position: "", created_at: "" } },
  ];

  return <MembersClient teamId={teamId} initialMembers={mockMembers} />;
}
