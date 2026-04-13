"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Member } from "@/lib/divide/algorithm";

type FutureSchedule = {
  id: string;
  date: string;
  location: string | null;
  attendingIds: string[];
};

type MemberSelectStepProps = {
  registeredMembers: Member[];
  futureSchedules: FutureSchedule[];
  initialSelectedIds?: Set<string> | null;
  initialDummies?: Member[];
  onChange: (selectedMembers: Member[], selectedIds: Set<string>, dummies: Member[]) => void;
};

type Gender = "男" | "女" | "未設定";

function getDummyName(index: number): string {
  let name = "";
  let n = index;
  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `助っ人${name}`;
}

// 性別ごとの背景スタイル
function genderStyles(gender: string, checked: boolean) {
  if (checked) {
    if (gender === "男") return "border-indigo-400 bg-blue-50 ring-2 ring-indigo-300";
    if (gender === "女") return "border-indigo-400 bg-pink-50 ring-2 ring-indigo-300";
    return "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-300";
  }
  if (gender === "男") return "border-blue-100 bg-blue-50/40 hover:border-blue-200";
  if (gender === "女") return "border-pink-100 bg-pink-50/40 hover:border-pink-200";
  return "border-gray-100 bg-white hover:border-gray-200";
}

function genderLabel(gender: string) {
  if (gender === "男") return { text: "男", cls: "text-blue-600" };
  if (gender === "女") return { text: "女", cls: "text-pink-600" };
  return { text: "—", cls: "text-gray-400" };
}

const scheduleFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatScheduleDate(iso: string): string {
  return scheduleFormat.format(new Date(iso));
}

export function MemberSelectStep({
  registeredMembers,
  futureSchedules,
  initialSelectedIds,
  initialDummies,
  onChange,
}: MemberSelectStepProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    initialSelectedIds ?? new Set(registeredMembers.map((m) => m.id))
  );
  const [dummies, setDummies] = useState<Member[]>(initialDummies ?? []);
  const [editingDummyId, setEditingDummyId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftGender, setDraftGender] = useState<Gender>("未設定");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  const allMembers = [...registeredMembers, ...dummies];
  const selectedMembers = allMembers.filter((m) => selectedIds.has(m.id));

  useEffect(() => {
    onChange(selectedMembers, selectedIds, dummies);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, dummies]);

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

  const openEditDialog = (dummy: Member) => {
    setEditingDummyId(dummy.id);
    setDraftName(dummy.name);
    setDraftGender((dummy.gender as Gender) ?? "未設定");
  };

  const saveEdit = () => {
    if (!editingDummyId) return;
    const name = draftName.trim() || "助っ人";
    setDummies((prev) =>
      prev.map((d) => (d.id === editingDummyId ? { ...d, name, gender: draftGender } : d))
    );
    setEditingDummyId(null);
  };

  // 選択した日程の参加者で登録メンバーの選択状態を上書きする。
  // 助っ人は現在の選択状態を維持。
  const applySchedule = (schedule: FutureSchedule) => {
    const registeredIds = new Set(registeredMembers.map((m) => m.id));
    const attendingRegistered = schedule.attendingIds.filter((id) => registeredIds.has(id));
    const keptDummyIds = dummies.map((d) => d.id).filter((id) => selectedIds.has(id));
    setSelectedIds(new Set([...attendingRegistered, ...keptDummyIds]));
    setScheduleDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900">メンバー選択</h3>
          <p className="text-sm text-gray-500">{selectedMembers.length}人選択中</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScheduleDialogOpen(true)}
            disabled={futureSchedules.length === 0}
            className="rounded-lg"
            aria-label="日程の参加者を反映"
          >
            参加者を反映
          </Button>
          <Button variant="outline" size="sm" onClick={addDummy} className="rounded-lg" aria-label="ダミーメンバーを追加">
            + 助っ人追加
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {allMembers.map((member) => {
          const checked = selectedIds.has(member.id);
          const g = genderLabel(member.gender);
          return (
            <div
              key={member.id}
              onClick={() => toggleMember(member.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg border cursor-pointer transition-all duration-150 ${genderStyles(member.gender, checked)}`}
              role="checkbox"
              aria-checked={checked}
              aria-label={`${member.name}を選択`}
            >
              <span className="text-xs font-semibold text-gray-900 w-full text-center truncate leading-tight px-1">
                {member.name}
              </span>
              <span className={`text-[10px] font-bold leading-none ${g.cls}`}>{g.text}</span>
              {member.isDummy && (
                <span className="text-[8px] text-gray-400 leading-none">助っ人</span>
              )}

              {member.isDummy && (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openEditDialog(member); }}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 flex items-center justify-center"
                    aria-label={`${member.name}を編集`}
                  >
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeDummy(member.id); }}
                    className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center"
                    aria-label={`${member.name}を削除`}
                  >
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* 日程選択ダイアログ（参加者を反映） */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>日程を選択</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-[60vh] overflow-y-auto">
            {futureSchedules.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">今後の日程はありません</p>
            ) : (
              futureSchedules.map((s) => {
                const attendingCount = s.attendingIds.filter((id) =>
                  registeredMembers.some((m) => m.id === id)
                ).length;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => applySchedule(s)}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900">{formatScheduleDate(s.date)}</p>
                        {s.location && (
                          <p className="text-xs text-gray-500 truncate">{s.location}</p>
                        )}
                      </div>
                      <span className="text-xs font-medium text-indigo-600 whitespace-nowrap">
                        参加 {attendingCount}人
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)} className="rounded-lg">
              キャンセル
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 助っ人編集ダイアログ */}
      <Dialog open={editingDummyId !== null} onOpenChange={(open) => !open && setEditingDummyId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>助っ人を編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="dummy-name">名前</Label>
              <Input
                id="dummy-name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="名前を入力"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>性別</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["男", "女", "未設定"] as Gender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setDraftGender(g)}
                    className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
                      draftGender === g
                        ? g === "男"
                          ? "border-blue-400 bg-blue-50 text-blue-700"
                          : g === "女"
                          ? "border-pink-400 bg-pink-50 text-pink-700"
                          : "border-indigo-400 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDummyId(null)} className="rounded-lg">キャンセル</Button>
            <Button onClick={saveEdit} className="rounded-lg bg-indigo-600 hover:bg-indigo-700">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
