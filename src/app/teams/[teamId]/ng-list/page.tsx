// TODO: Supabase接続後に元のServer Component版に戻す
import { NgListClient } from "./NgListClient";

export default async function NgListPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  const mockPairs = [
    { id: "ng1", team_id: teamId, created_at: "2024-03-01T10:00:00Z", user_a: { id: "u1", name: "田中太郎" }, user_b: { id: "u3", name: "鈴木一郎" } },
    { id: "ng2", team_id: teamId, created_at: "2024-03-05T14:00:00Z", user_a: { id: "u2", name: "佐藤花子" }, user_b: { id: "u5", name: "高橋美咲" } },
  ];

  const mockMembers = [
    { id: "u1", name: "田中太郎" },
    { id: "u2", name: "佐藤花子" },
    { id: "u3", name: "鈴木一郎" },
    { id: "u4", name: "山田次郎" },
    { id: "u5", name: "高橋美咲" },
    { id: "u6", name: "中村大輔" },
  ];

  return <NgListClient teamId={teamId} initialPairs={mockPairs} members={mockMembers} />;
}
