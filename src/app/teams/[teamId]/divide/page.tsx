// TODO: Supabase接続後に元のServer Component版に戻す
import { DivideClient } from "./DivideClient";
import type { Member } from "@/lib/divide/algorithm";
import type { NgPair } from "@/types";

export default async function DividePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  // チーム分けの Member.id は ng_pairs.user_id_* と同じ「ユーザーID」にすること（team_members.id ではない）
  const mockMembers: Member[] = [
    { id: "u1", name: "田中太郎", gender: "男" },
    { id: "u2", name: "佐藤花子", gender: "女" },
    { id: "u3", name: "鈴木一郎", gender: "男" },
    { id: "u4", name: "山田次郎", gender: "男" },
    { id: "u5", name: "高橋美咲", gender: "女" },
    { id: "u6", name: "伊藤健太", gender: "男" },
    { id: "u7", name: "渡辺さくら", gender: "女" },
    { id: "u8", name: "中村大輔", gender: "未設定" },
  ];

  // NGリスト画面のmockと揃えておくこと（本番では同じng_pairsテーブルから取得されるので一致する）
  const mockNgPairs: NgPair[] = [
    {
      id: "mock-ng-1",
      team_id: teamId,
      user_id_a: "u1",
      user_id_b: "u3",
      created_by: null,
      created_at: "2024-03-01T10:00:00Z",
    },
    {
      id: "mock-ng-2",
      team_id: teamId,
      user_id_a: "u2",
      user_id_b: "u5",
      created_by: null,
      created_at: "2024-03-05T14:00:00Z",
    },
  ];

  return (
    <DivideClient
      registeredMembers={mockMembers}
      attendingIds={["u1", "u2", "u3", "u4", "u5", "u6"]}
      ngPairs={mockNgPairs}
      isHost={true}
    />
  );
}
