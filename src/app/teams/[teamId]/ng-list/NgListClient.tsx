"use client";

import { useRouter } from "next/navigation";
import { NgPairList } from "@/components/ng/NgPairList";
import { NgPairForm } from "@/components/ng/NgPairForm";
type NgPairWithUsers = {
  id: string;
  team_id: string;
  created_at: string;
  user_a: { id: string; name: string };
  user_b: { id: string; name: string };
};

type NgListClientProps = {
  teamId: string;
  initialPairs: NgPairWithUsers[];
  members: { id: string; name: string }[];
};

export function NgListClient({ teamId, initialPairs, members }: NgListClientProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">NGリスト管理</h2>
          <p className="text-sm text-muted-foreground">
            チーム分け時に同じチームにならないペアを設定します（{initialPairs.length}件）
          </p>
        </div>
        <NgPairForm teamId={teamId} members={members} onAdded={() => router.refresh()} />
      </div>

      <NgPairList pairs={initialPairs} teamId={teamId} onDeleted={() => router.refresh()} />
    </div>
  );
}
