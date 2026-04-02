"use client";

import { useRouter } from "next/navigation";
import { MemberList } from "@/components/members/MemberList";
import { InviteLink } from "@/components/members/InviteLink";
import type { TeamMemberWithUser } from "@/types";

type MembersClientProps = {
  teamId: string;
  initialMembers: TeamMemberWithUser[];
};

export function MembersClient({ teamId, initialMembers }: MembersClientProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">メンバー管理</h2>
        <div className="flex gap-2">
          <InviteLink teamId={teamId} />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {initialMembers.length}人のメンバー
      </p>

      <MemberList
        members={initialMembers}
        teamId={teamId}
        onUpdated={() => router.refresh()}
      />
    </div>
  );
}
