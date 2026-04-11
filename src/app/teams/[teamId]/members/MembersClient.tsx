"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { MemberList } from "@/components/members/MemberList";
import type { TeamMemberWithUser } from "@/types";

type MembersClientProps = {
  teamId: string;
  initialMembers: TeamMemberWithUser[];
};

export function MembersClient({ teamId, initialMembers }: MembersClientProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">メンバー管理</h2>
        <Link
          href={`/teams/${teamId}/settings#invite-links`}
          className={buttonVariants({ variant: "outline" })}
        >
          招待リンクを発行
        </Link>
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
