"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NgPairList } from "@/components/ng/NgPairList";
import { NgPairForm } from "@/components/ng/NgPairForm";
import { MustPairList } from "@/components/ng/MustPairList";
import { MustPairForm } from "@/components/ng/MustPairForm";

type PairWithUsers = {
  id: string;
  team_id: string;
  user_id_a: string;
  user_id_b: string;
  created_at: string;
  user_a: { id: string; name: string };
  user_b: { id: string; name: string };
};

type Conflict = {
  user_a: { id: string; name: string };
  user_b: { id: string; name: string };
};

type NgListClientProps = {
  teamId: string;
  initialNgPairs: PairWithUsers[];
  initialMustPairs: PairWithUsers[];
  conflicts: Conflict[];
  members: { id: string; name: string; isGuest: boolean }[];
};

export function NgListClient({
  teamId,
  initialNgPairs,
  initialMustPairs,
  conflicts,
  members,
}: NgListClientProps) {
  const router = useRouter();
  const refresh = () => router.refresh();

  // chain 防止: 既に must_pair に登録されているメンバー
  const lockedMemberIds = useMemo(
    () => new Set(initialMustPairs.flatMap((p) => [p.user_id_a, p.user_id_b])),
    [initialMustPairs]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/teams/${teamId}/settings`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 設定に戻る
        </Link>
      </div>

      <div className="section-strip">
        <h2 className="text-xl font-bold">チーム分け条件</h2>
        <p className="text-sm text-muted-foreground mt-1">
          チーム分け時に守りたい組み合わせを設定します。
        </p>
      </div>

      {conflicts.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            ⚠ 矛盾しているペアがあります
          </p>
          <p className="text-xs text-amber-800 mt-1">
            以下のペアは「同じチームにしない」と「必ず同じチームにする」の両方に登録されています。チーム分け時に「必ずペア」が優先されます。どちらか片方を削除してください。
          </p>
          <ul className="mt-2 space-y-1">
            {conflicts.map((c) => (
              <li
                key={`${c.user_a.id}-${c.user_b.id}`}
                className="text-sm text-amber-900 font-medium"
              >
                ・{c.user_a.name} ✕ {c.user_b.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">同じチームにしないペア</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              指定したペアは別チームに分かれるよう調整されます（{initialNgPairs.length}件）
            </p>
          </div>
          <NgPairForm teamId={teamId} members={members} onAdded={refresh} />
        </div>
        <NgPairList pairs={initialNgPairs} teamId={teamId} onDeleted={refresh} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-emerald-700">
              必ず同じチームにするペア
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              両方が参加する場合は必ず同じチームに入ります（{initialMustPairs.length}件）
            </p>
          </div>
          <MustPairForm
            teamId={teamId}
            members={members}
            lockedMemberIds={lockedMemberIds}
            onAdded={refresh}
          />
        </div>
        <MustPairList pairs={initialMustPairs} teamId={teamId} onDeleted={refresh} />
      </section>
    </div>
  );
}
