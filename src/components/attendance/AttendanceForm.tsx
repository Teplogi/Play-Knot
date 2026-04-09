"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type AttendanceFormProps = {
  scheduleId: string;
  currentStatus: "attend" | "absent" | null;
  currentComment: string;
  onUpdated: () => void;
  /** スケジュールの日付（ISO文字列） */
  scheduleDate: string;
  /** 定員（null なら無制限） */
  capacity?: number | null;
  /** 自分を除いた参加確定者数 */
  othersAttendCount?: number;
};

export function AttendanceForm({
  scheduleId,
  currentStatus,
  currentComment,
  onUpdated,
  scheduleDate,
  capacity = null,
  othersAttendCount = 0,
}: AttendanceFormProps) {
  const [comment, setComment] = useState(currentComment);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"attend" | "absent" | null>(currentStatus);
  const [showComment, setShowComment] = useState(!!currentComment);
  const [isEditing, setIsEditing] = useState(!currentStatus);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 定員関連の状態計算
  const userIsCurrentlyAttending = selectedStatus === "attend";
  const currentAttendCount = othersAttendCount + (userIsCurrentlyAttending ? 1 : 0);
  const isFull = capacity !== null && currentAttendCount >= capacity;
  const wouldBeFullOnAttend = capacity !== null && othersAttendCount + 1 >= capacity;
  const attendDisabled = !userIsCurrentlyAttending && isFull;

  // 当日キャンセルかどうかの判定
  const isSamedayCancelAttempt = (status: "attend" | "absent") => {
    if (status !== "absent" || !userIsCurrentlyAttending) return false;
    const sd = new Date(scheduleDate);
    const scheduleDayStart = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate());
    return new Date() >= scheduleDayStart;
  };

  const handleSubmit = async (status: "attend" | "absent") => {
    // 満員ガード
    if (status === "attend" && !userIsCurrentlyAttending && capacity !== null && othersAttendCount >= capacity) {
      toast.error("定員に達しているため参加できません");
      return;
    }

    // 当日キャンセルの場合、確認ダイアログを表示
    if (isSamedayCancelAttempt(status)) {
      setConfirmOpen(true);
      return;
    }

    await submitAttendance(status);
  };

  const submitAttendance = async (status: "attend" | "absent") => {
    setLoading(true);
    const previousStatus = selectedStatus;
    setSelectedStatus(status);

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId, status, comment }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "出欠の登録に失敗しました");
        setSelectedStatus(previousStatus);
        return;
      }
      const data = await res.json();
      if (data.isSamedayCancel) {
        toast("当日キャンセルとして記録しました", {
          description: "出欠の変更が反映されました",
        });
      } else {
        toast.success(status === "attend" ? "参加で回答しました" : "不参加で回答しました");
      }

      // 定員関連の遷移通知
      if (status === "attend" && previousStatus !== "attend" && wouldBeFullOnAttend) {
        toast.info("定員に達しました", { duration: 4000 });
      }
      if (status === "absent" && previousStatus === "attend" && capacity !== null && currentAttendCount === capacity) {
        toast.info("空きが出たため再募集中になりました", { duration: 4000 });
      }

      setIsEditing(false);
      onUpdated();
    } catch {
      toast.error("エラーが発生しました");
      setSelectedStatus(previousStatus);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSamedayCancel = () => {
    setConfirmOpen(false);
    submitAttendance("absent");
  };

  // 回答済み表示
  if (selectedStatus && !isEditing) {
    return (
      <div className="space-y-3">
        {/* 回答済みステータス */}
        <div
          className={`rounded-xl border-2 p-4 ${
            selectedStatus === "attend"
              ? "border-green-200 bg-green-50/70"
              : "border-red-200 bg-red-50/70"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selectedStatus === "attend"
                  ? "bg-green-500 text-white"
                  : "bg-red-500 text-white"
              }`}
            >
              {selectedStatus === "attend" ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              )}
            </div>
            <div className="flex-1">
              <p className={`font-semibold ${
                selectedStatus === "attend" ? "text-green-800" : "text-red-800"
              }`}>
                {selectedStatus === "attend" ? "参加" : "不参加"}で回答済み
              </p>
              {comment && (
                <p className="text-sm text-gray-500 mt-0.5">{comment}</p>
              )}
            </div>
          </div>
        </div>

        {/* 定員ステータス */}
        {capacity !== null && (
          <div
            className={`rounded-lg border p-2.5 text-sm flex items-center justify-between ${
              isFull
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-indigo-50 border-indigo-100 text-indigo-700"
            }`}
          >
            <span className="font-medium text-xs">
              {isFull ? "定員に達しています" : "参加受付中"}
            </span>
            <span className="text-xs font-semibold">
              {currentAttendCount} / {capacity} 人
            </span>
          </div>
        )}

        {/* 変更ボタン */}
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
          回答を変更する
        </button>

        {/* 当日キャンセル確認ダイアログ */}
        <SamedayCancelDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onConfirm={handleConfirmSamedayCancel}
        />
      </div>
    );
  }

  // 回答フォーム（未回答 or 編集中）
  return (
    <div className="space-y-4">
      {/* 定員ステータスバナー */}
      {capacity !== null && (
        <div
          className={`rounded-lg border p-3 text-sm flex items-center justify-between ${
            isFull
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-indigo-50 border-indigo-100 text-indigo-700"
          }`}
        >
          <span className="font-medium">
            {isFull ? "定員に達しています" : "参加受付中"}
          </span>
          <span className="text-xs font-semibold">
            {currentAttendCount} / {capacity} 人
          </span>
        </div>
      )}

      {/* 編集中の案内 */}
      {selectedStatus && isEditing && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            現在の回答: <span className={`font-medium ${selectedStatus === "attend" ? "text-green-600" : "text-red-600"}`}>
              {selectedStatus === "attend" ? "参加" : "不参加"}
            </span>
          </p>
          <button
            onClick={() => setIsEditing(false)}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            キャンセル
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => handleSubmit("attend")}
          disabled={loading || attendDisabled}
          className={`h-14 rounded-xl text-base font-semibold transition-all ${
            selectedStatus === "attend"
              ? "bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-200"
              : attendDisabled
              ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
              : "bg-green-50 hover:bg-green-100 text-green-700 border border-green-200"
          }`}
          aria-label={attendDisabled ? "定員に達しているため参加できません" : "参加する"}
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            {attendDisabled ? "満員" : "参加"}
          </span>
        </Button>
        <Button
          onClick={() => handleSubmit("absent")}
          disabled={loading}
          className={`h-14 rounded-xl text-base font-semibold transition-all ${
            selectedStatus === "absent"
              ? "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-200"
              : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
          }`}
          aria-label="不参加にする"
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            不参加
          </span>
        </Button>
      </div>

      {/* コメントアコーディオン */}
      {!showComment ? (
        <button
          onClick={() => setShowComment(true)}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          コメントを追加
        </button>
      ) : (
        <div className="animate-page-in">
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="遅刻します、など"
            className="rounded-lg border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
            aria-label="コメント"
          />
        </div>
      )}

      {/* 当日キャンセル確認ダイアログ */}
      <SamedayCancelDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmSamedayCancel}
      />
    </div>
  );
}

function SamedayCancelDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">当日のキャンセルになります</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 leading-relaxed">
          練習日当日の不参加への変更は「当日キャンセル」として記録されます。よろしいですか？
        </p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-lg"
          >
            戻る
          </Button>
          <Button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 hover:bg-red-700"
          >
            不参加にする
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
