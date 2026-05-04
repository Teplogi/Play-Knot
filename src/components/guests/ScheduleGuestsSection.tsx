"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { ScheduleGuestWithGuest, TeamGuest } from "@/types";

type Props = {
  scheduleId: string;
  invitedGuests: ScheduleGuestWithGuest[];
  teamGuests: TeamGuest[];
  canManage: boolean;
  onUpdated: () => void;
};

function genderClass(gender: string) {
  if (gender === "男") return "bg-blue-50 text-blue-600 border-blue-200";
  if (gender === "女") return "bg-pink-50 text-pink-600 border-pink-200";
  return "bg-gray-50 text-gray-500 border-gray-200";
}

export function ScheduleGuestsSection({
  scheduleId,
  invitedGuests,
  teamGuests,
  canManage,
  onUpdated,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const invitedGuestIds = useMemo(
    () => new Set(invitedGuests.map((g) => g.guest_id)),
    [invitedGuests]
  );
  const availableGuests = teamGuests.filter((g) => !invitedGuestIds.has(g.id));

  const invite = async (guestId: string) => {
    setPendingId(guestId);
    try {
      const res = await fetch("/api/schedule-guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId, guestId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "招集に失敗しました");
        return;
      }
      toast.success("ゲストを招集しました");
      onUpdated();
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setPendingId(null);
    }
  };

  const uninvite = async (scheduleGuestId: string) => {
    if (!confirm("この日程からこのゲストを外しますか？")) return;
    setPendingId(scheduleGuestId);
    try {
      const res = await fetch(`/api/schedule-guests/${scheduleGuestId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "招集解除に失敗しました");
        return;
      }
      toast.success("招集を解除しました");
      onUpdated();
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">招集ゲスト</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            この日程に呼ぶ助っ人を選ぶと、参加者として出欠・チーム分けに反映されます。
          </p>
        </div>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => setDialogOpen(true)}
            disabled={availableGuests.length === 0}
          >
            + ゲストを招集
          </Button>
        )}
      </div>

      {invitedGuests.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">招集中のゲストはいません</p>
      ) : (
        <div className="space-y-1.5">
          {invitedGuests.map((row) => {
            const g = row.team_guests;
            return (
              <div
                key={row.id}
                className="flex items-center gap-3 bg-amber-50/40 rounded-lg px-3 py-2"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-amber-100 text-amber-700">
                  {g.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <p className="text-sm font-medium text-gray-900 truncate">{g.name}</p>
                  {g.gender !== "未設定" && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${genderClass(g.gender)}`}
                    >
                      {g.gender}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200"
                  >
                    ゲスト
                  </Badge>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-red-500 h-7 text-xs"
                    onClick={() => uninvite(row.id)}
                    disabled={pendingId === row.id}
                    aria-label={`${g.name}の招集を解除`}
                  >
                    解除
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ゲストを招集</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-[60vh] overflow-y-auto">
            {availableGuests.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                招集できる助っ人はいません
              </p>
            ) : (
              availableGuests.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => invite(g.id)}
                  disabled={pendingId === g.id}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{g.name}</span>
                    {g.gender !== "未設定" && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${genderClass(g.gender)}`}
                      >
                        {g.gender}
                      </Badge>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-lg"
            >
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
