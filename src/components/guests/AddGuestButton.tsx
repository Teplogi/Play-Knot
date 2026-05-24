"use client";

import { useState } from "react";
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
import type { TeamGuest } from "@/types";

function genderClass(gender: string) {
  if (gender === "男") return "bg-blue-50 text-blue-600 border-blue-200";
  if (gender === "女") return "bg-pink-50 text-pink-600 border-pink-200";
  return "bg-gray-50 text-gray-500 border-gray-200";
}

/**
 * 出席一覧の右上に置く「+ ゲスト招集」ボタン + 招集ダイアログ。
 * 以前は ScheduleGuestsSection が一画面分の UI を担っていたが、
 * 招集ボタンと招集解除はそれぞれ「出席一覧」ヘッダーと参加者行内に
 * 統合したため、招集 (追加) 機能のみここに残す。
 */
export function AddGuestButton({
  scheduleId,
  availableGuests,
  onUpdated,
  size = "sm",
}: {
  scheduleId: string;
  availableGuests: TeamGuest[];
  onUpdated: () => void;
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

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

  return (
    <>
      <Button
        variant="outline"
        size={size}
        className="rounded-lg text-xs h-8"
        onClick={() => setOpen(true)}
        disabled={availableGuests.length === 0}
        aria-label="ゲストを招集"
      >
        + ゲスト招集
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
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
              onClick={() => setOpen(false)}
              className="rounded-lg"
            >
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
