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
import type { Member } from "@/lib/divide/algorithm";

type FutureSchedule = {
  id: string;
  date: string;
  location: string | null;
  attendingIds: string[];
  invitedGuestIds: string[];
};

type MemberSelectStepProps = {
  registeredMembers: Member[];
  /** team_guests を Member 形に正規化したもの（isDummy=true、id は guest UUID） */
  guestMembers: Member[];
  futureSchedules: FutureSchedule[];
  initialSelectedIds?: Set<string> | null;
  onChange: (selectedMembers: Member[], selectedIds: Set<string>) => void;
};

// 性別ごとの背景スタイル
function genderStyles(gender: string, checked: boolean, isGuest: boolean) {
  if (checked) {
    if (isGuest) return "border-amber-400 bg-amber-50 ring-2 ring-amber-300";
    if (gender === "男") return "border-indigo-400 bg-blue-50 ring-2 ring-indigo-300";
    if (gender === "女") return "border-indigo-400 bg-pink-50 ring-2 ring-indigo-300";
    return "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-300";
  }
  if (isGuest) return "border-amber-100 bg-amber-50/30 hover:border-amber-200";
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
  guestMembers,
  futureSchedules,
  initialSelectedIds,
  onChange,
}: MemberSelectStepProps) {
  // 初期選択: registeredMembers 全員（ゲストはオプトイン）
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    initialSelectedIds ?? new Set(registeredMembers.map((m) => m.id))
  );
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  const allMembers = [...registeredMembers, ...guestMembers];
  const selectedMembers = allMembers.filter((m) => selectedIds.has(m.id));

  useEffect(() => {
    onChange(selectedMembers, selectedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  const toggleMember = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // 選択した日程の参加者で選択状態を上書きする。
  // 登録メンバーは attendances.status='attend'、ゲストは schedule_guests から流し込む。
  const applySchedule = (schedule: FutureSchedule) => {
    const registeredIds = new Set(registeredMembers.map((m) => m.id));
    const guestIds = new Set(guestMembers.map((m) => m.id));
    const attendingRegistered = schedule.attendingIds.filter((id) => registeredIds.has(id));
    const invitedGuests = schedule.invitedGuestIds.filter((id) => guestIds.has(id));
    setSelectedIds(new Set([...attendingRegistered, ...invitedGuests]));
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
        </div>
      </div>

      {allMembers.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          メンバーがいません。メンバー管理画面から追加してください。
        </p>
      ) : (
        <div className="grid grid-cols-6 gap-1.5">
          {allMembers.map((member) => {
            const checked = selectedIds.has(member.id);
            const g = genderLabel(member.gender);
            const isGuest = !!member.isDummy;
            return (
              <div
                key={member.id}
                onClick={() => toggleMember(member.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg border cursor-pointer transition-all duration-150 ${genderStyles(member.gender, checked, isGuest)}`}
                role="checkbox"
                aria-checked={checked}
                aria-label={`${member.name}を選択`}
              >
                <span className="text-xs font-semibold text-gray-900 w-full text-center truncate leading-tight px-1">
                  {member.name}
                </span>
                <span className={`text-[10px] font-bold leading-none ${g.cls}`}>{g.text}</span>
                {isGuest && (
                  <span className="text-[8px] text-amber-600 leading-none">ゲスト</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {guestMembers.length === 0 && (
        <p className="text-xs text-gray-400">
          助っ人はメンバー管理画面で登録できます。
        </p>
      )}

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
                const guestCount = s.invitedGuestIds.length;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => applySchedule(s)}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatScheduleDate(s.date)}
                        </p>
                        {s.location && (
                          <p className="text-xs text-gray-500 truncate">{s.location}</p>
                        )}
                      </div>
                      <span className="text-xs font-medium text-indigo-600 whitespace-nowrap">
                        参加 {attendingCount}人
                        {guestCount > 0 && (
                          <span className="text-amber-600"> +ゲスト{guestCount}</span>
                        )}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScheduleDialogOpen(false)}
              className="rounded-lg"
            >
              キャンセル
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
