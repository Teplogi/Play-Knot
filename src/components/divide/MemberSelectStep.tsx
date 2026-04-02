"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Member } from "@/lib/divide/algorithm";

type MemberSelectStepProps = {
  registeredMembers: Member[];
  onNext: (selectedMembers: Member[]) => void;
};

function getDummyName(index: number): string {
  let name = "";
  let n = index;
  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `助っ人${name}`;
}

function InitialAvatar({ name, gender }: { name: string; gender: string }) {
  const bg = gender === "男" ? "bg-blue-100 text-blue-700" : gender === "女" ? "bg-pink-100 text-pink-700" : "bg-gray-100 text-gray-500";
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${bg}`}>
      {name.charAt(0)}
    </div>
  );
}

export function MemberSelectStep({ registeredMembers, onNext }: MemberSelectStepProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(registeredMembers.map((m) => m.id))
  );
  const [dummies, setDummies] = useState<Member[]>([]);
  const allMembers = [...registeredMembers, ...dummies];

  const toggleMember = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    setSelectedIds(next);
  };

  const addDummy = () => {
    const dummy: Member = {
      id: `dummy-${Date.now()}-${dummies.length}`,
      name: getDummyName(dummies.length),
      gender: "未設定",
      isDummy: true,
    };
    setDummies((prev) => [...prev, dummy]);
    setSelectedIds((prev) => new Set([...prev, dummy.id]));
  };

  const removeDummy = (id: string) => {
    setDummies((prev) => prev.filter((d) => d.id !== id));
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  const selectedMembers = allMembers.filter((m) => selectedIds.has(m.id));
  const canProceed = selectedMembers.length >= 2;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">メンバー選択</h3>
          <p className="text-sm text-gray-500">{selectedMembers.length}人選択中</p>
        </div>
        <Button variant="outline" size="sm" onClick={addDummy} className="rounded-lg" aria-label="ダミーメンバーを追加">
          + 助っ人追加
        </Button>
      </div>

      <div className="space-y-2">
        {allMembers.map((member) => {
          const checked = selectedIds.has(member.id);
          return (
            <div
              key={member.id}
              onClick={() => toggleMember(member.id)}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                checked ? "border-indigo-200 bg-indigo-50/50 shadow-sm" : "border-gray-100 bg-white hover:border-gray-200"
              }`}
              role="checkbox"
              aria-checked={checked}
              aria-label={`${member.name}を選択`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleMember(member.id)}
                className="h-4 w-4 rounded accent-indigo-600"
                onClick={(e) => e.stopPropagation()}
                tabIndex={-1}
              />
              <InitialAvatar name={member.name} gender={member.gender} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900">{member.name}</span>
                <div className="flex gap-1.5 mt-0.5">
                  {member.gender === "男" && <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-[10px] px-1.5 py-0">男</Badge>}
                  {member.gender === "女" && <Badge variant="outline" className="bg-pink-50 text-pink-600 border-pink-200 text-[10px] px-1.5 py-0">女</Badge>}
                  {member.isDummy && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">助っ人</Badge>}
                </div>
              </div>
              {member.isDummy && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); removeDummy(member.id); }}
                  className="text-gray-400 hover:text-red-500 h-7 px-2"
                  aria-label={`${member.name}を削除`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={() => onNext(selectedMembers)} disabled={!canProceed} className="rounded-xl px-6" aria-label="設定へ進む">
          次へ：設定 →
        </Button>
      </div>
      {!canProceed && selectedMembers.length > 0 && (
        <p className="text-sm text-red-500 text-right">2人以上選択してください</p>
      )}
    </div>
  );
}
