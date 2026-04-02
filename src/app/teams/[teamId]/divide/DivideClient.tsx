"use client";

import { useState, useCallback } from "react";
import { MemberSelectStep } from "@/components/divide/MemberSelectStep";
import { DivideSettingStep, type DivideSettings } from "@/components/divide/DivideSettingStep";
import { DivideResultStep } from "@/components/divide/DivideResultStep";
import { divideTeams, calcTeamCount, type Member } from "@/lib/divide/algorithm";
import type { NgPair } from "@/types";

type DivideClientProps = {
  registeredMembers: Member[];
  attendingIds: string[];
  ngPairs: NgPair[];
  isHost: boolean;
};

type Step = "select" | "settings" | "result";

const STEPS: { key: Step; label: string; num: number }[] = [
  { key: "select", label: "メンバー選択", num: 1 },
  { key: "settings", label: "設定", num: 2 },
  { key: "result", label: "結果", num: 3 },
];

export function DivideClient({ registeredMembers, attendingIds, ngPairs }: DivideClientProps) {
  const [step, setStep] = useState<Step>("select");
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [settings, setSettings] = useState<DivideSettings | null>(null);
  const [result, setResult] = useState<{ teams: Member[][]; hasNgViolation: boolean } | null>(null);

  const initialMembers = attendingIds.length > 0
    ? registeredMembers.filter((m) => attendingIds.includes(m.id))
    : registeredMembers;

  const executeDivide = useCallback(
    (members: Member[], divideSettings: DivideSettings) => {
      const teamCount = divideSettings.divideBy === "team_count"
        ? divideSettings.value
        : calcTeamCount(members.length, divideSettings.value);
      setResult(divideTeams(members, teamCount, divideSettings.method, ngPairs));
    },
    [ngPairs]
  );

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">チーム分け</h2>

      {/* ステッパー */}
      <div className="flex items-center gap-0" role="progressbar" aria-label="チーム分けの進捗">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1 last:flex-initial">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                i <= currentStepIndex
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "bg-gray-100 text-gray-400"
              }`}>
                {i < currentStepIndex ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                ) : (
                  s.num
                )}
              </div>
              <span className={`text-sm font-medium hidden sm:inline ${i <= currentStepIndex ? "text-indigo-700" : "text-gray-400"}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`stepper-line mx-3 ${i < currentStepIndex ? "bg-indigo-300" : "bg-gray-100"}`} />
            )}
          </div>
        ))}
      </div>

      {/* STEP内容 */}
      <div className="animate-page-in">
        {step === "select" && (
          <MemberSelectStep
            registeredMembers={attendingIds.length > 0 ? initialMembers : registeredMembers}
            onNext={(members) => { setSelectedMembers(members); setStep("settings"); }}
          />
        )}
        {step === "settings" && (
          <DivideSettingStep
            memberCount={selectedMembers.length}
            onBack={() => setStep("select")}
            onNext={(s) => { setSettings(s); executeDivide(selectedMembers, s); setStep("result"); }}
          />
        )}
        {step === "result" && result && (
          <DivideResultStep
            teams={result.teams}
            hasNgViolation={result.hasNgViolation}
            onBack={() => setStep("settings")}
            onReshuffle={() => settings && executeDivide(selectedMembers, settings)}
          />
        )}
      </div>
    </div>
  );
}
