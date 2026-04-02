"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type AttendanceFormProps = {
  scheduleId: string;
  currentStatus: "attend" | "absent" | null;
  currentComment: string;
  onUpdated: () => void;
};

export function AttendanceForm({ scheduleId, currentStatus, currentComment, onUpdated }: AttendanceFormProps) {
  const [comment, setComment] = useState(currentComment);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"attend" | "absent" | null>(currentStatus);
  const [showComment, setShowComment] = useState(!!currentComment);

  const handleSubmit = async (status: "attend" | "absent") => {
    setLoading(true);
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
        return;
      }
      const data = await res.json();
      if (data.isDotacan) {
        toast.warning("出欠を変更しました（ホストに通知されます）");
      } else {
        toast.success(status === "attend" ? "参加で回答しました" : "不参加で回答しました");
      }
      onUpdated();
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => handleSubmit("attend")}
          disabled={loading}
          className={`h-14 rounded-xl text-base font-semibold transition-all ${
            selectedStatus === "attend"
              ? "bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-200"
              : "bg-green-50 hover:bg-green-100 text-green-700 border border-green-200"
          }`}
          aria-label="参加する"
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            参加
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
    </div>
  );
}
