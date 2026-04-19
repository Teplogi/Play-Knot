"use client";

import { useMemo, useState } from "react";
import { MemberSelectStep } from "@/components/divide/MemberSelectStep";
import { DivideSettingStep, type DivideSettings } from "@/components/divide/DivideSettingStep";
import { DivideResultStep } from "@/components/divide/DivideResultStep";
import { divideTeams, calcTeamCount, type Member } from "@/lib/divide/algorithm";
import { Button } from "@/components/ui/button";
import type { NgPair } from "@/types";

export type FutureSchedule = {
  id: string;
  date: string;
  location: string | null;
  attendingIds: string[];
};

type DivideDefaults = {
  divideBy: "team_count" | "members_per_team";
  divideValue: number;
  divideMethod: "random" | "gender_equal";
};

type DivideClientProps = {
  registeredMembers: Member[];
  futureSchedules: FutureSchedule[];
  ngPairs: NgPair[];
  isHost: boolean;
  defaults: DivideDefaults;
};

type Committed = {
  members: Member[];
  settings: DivideSettings;
  version: number; // 再抽選で bump
};

export function DivideClient({ registeredMembers, futureSchedules, ngPairs, defaults }: DivideClientProps) {
  // 編集中（まだ実行していない）状態
  const [selectedMembers, setSelectedMembers] = useState<Member[]>(registeredMembers);
  const [savedSelectedIds, setSavedSelectedIds] = useState<Set<string> | null>(null);
  const [savedDummies, setSavedDummies] = useState<Member[]>([]);
  const [settings, setSettings] = useState<DivideSettings | null>(null);

  // 実行時点で確定したスナップショット
  const [committed, setCommitted] = useState<Committed | null>(null);

  const canExecute = settings !== null && selectedMembers.length >= 2;

  const result = useMemo(() => {
    if (!committed) return null;
    const { members, settings: s } = committed;
    const teamCount = s.divideBy === "team_count"
      ? s.value
      : calcTeamCount(members.length, s.value);
    return divideTeams(members, teamCount, s.method, ngPairs);
  }, [committed, ngPairs]);

  const execute = () => {
    if (!canExecute || !settings) return;
    setCommitted({ members: selectedMembers, settings, version: (committed?.version ?? 0) + 1 });
  };

  const reshuffle = () => {
    if (!committed) return;
    setCommitted({ ...committed, version: committed.version + 1 });
  };

  // 実行後に編集があったかどうか（結果が古くなっているか）
  const isStale =
    committed !== null &&
    (committed.members !== selectedMembers || committed.settings !== settings);

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold text-gray-900">チーム分け</h2>

      {/* メンバー選択 */}
      <section>
        <MemberSelectStep
          registeredMembers={registeredMembers}
          futureSchedules={futureSchedules}
          initialSelectedIds={savedSelectedIds}
          initialDummies={savedDummies}
          onChange={(members, selectedIds, dummies) => {
            setSelectedMembers(members);
            setSavedSelectedIds(selectedIds);
            setSavedDummies(dummies);
          }}
        />
      </section>

      <hr className="border-gray-100" />

      {/* 設定 */}
      <section>
        <DivideSettingStep
          memberCount={selectedMembers.length}
          defaults={defaults}
          onChange={(s) => setSettings(s)}
        />
      </section>

      {/* 実行ボタン */}
      <div className="flex flex-col items-center gap-2">
        <Button
          onClick={execute}
          disabled={!canExecute}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-8 h-11"
          aria-label="チーム分けを実行"
        >
          {committed ? "再実行する" : "チーム分けを実行"}
        </Button>
        {!canExecute && selectedMembers.length < 2 && (
          <p className="text-xs text-gray-400">メンバーを2人以上選択してください</p>
        )}
        {isStale && (
          <p className="text-xs text-orange-600">設定が変更されています。再実行してください。</p>
        )}
      </div>

      <hr className="border-gray-100" />

      {/* 結果 */}
      <section className="space-y-4">
        <h3 className="font-semibold text-gray-900">チーム分け結果</h3>
        {!result ? (
          <p className="text-sm text-gray-500">「チーム分けを実行」を押すとここに結果が表示されます。</p>
        ) : (
          <DivideResultStep
            key={committed?.version}
            teams={result.teams}
            hasNgViolation={result.hasNgViolation}
            onReshuffle={reshuffle}
          />
        )}
      </section>
    </div>
  );
}
