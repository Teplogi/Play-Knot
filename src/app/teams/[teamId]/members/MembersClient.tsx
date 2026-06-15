"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { MemberList } from "@/components/members/MemberList";
import { GuestList } from "@/components/guests/GuestList";
import { GuestForm } from "@/components/guests/GuestForm";
import type { TeamGuest, TeamMemberWithUser } from "@/types";

type MembersClientProps = {
  teamId: string;
  initialMembers: TeamMemberWithUser[];
  initialGuests: TeamGuest[];
  canManage: boolean;
};

export function MembersClient({
  teamId,
  initialMembers,
  initialGuests,
  canManage,
}: MembersClientProps) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="section-strip flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold">メンバー管理</h2>
          <Link
            href={`/teams/${teamId}/settings#invite-links`}
            className={buttonVariants({ variant: "outline" })}
          >
            招待リンクを発行
          </Link>
        </div>

        <p className="text-sm text-muted-foreground">{initialMembers.length}人のメンバー</p>

        <MemberList members={initialMembers} teamId={teamId} onUpdated={refresh} />
      </section>

      <section className="space-y-4">
        <div className="section-strip flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">助っ人</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              アカウントを持たないゲストプレイヤー。日程ごとに招集して出欠・チーム分けに反映します。
            </p>
          </div>
          {canManage && (
            <GuestForm
              teamId={teamId}
              onUpdated={refresh}
              trigger={
                <Button variant="outline" className="rounded-lg">
                  + 助っ人を追加
                </Button>
              }
            />
          )}
        </div>

        <p className="text-sm text-muted-foreground">{initialGuests.length}人の助っ人</p>

        <GuestList
          teamId={teamId}
          guests={initialGuests}
          canManage={canManage}
          onUpdated={refresh}
        />
      </section>
    </div>
  );
}
