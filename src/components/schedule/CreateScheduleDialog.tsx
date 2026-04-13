"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type CreatorStatus = "attend" | "tentative" | "absent";

type CreateScheduleDialogProps = {
  teamId: string;
  defaults?: {
    startTime?: string;
    endTime?: string;
    deadlineHoursBefore?: number;
    locations?: string[];
    allowTentative?: boolean;
  };
};

// 日付と開始時刻から「X 時間前」の JST datetime-local 文字列を組み立てる
function computeDeadline(
  dateVal: string,
  startTime: string,
  hoursBefore: number
): string {
  const start = new Date(`${dateVal}T${startTime}:00+09:00`);
  if (isNaN(start.getTime())) return "";
  const deadlineDate = new Date(start.getTime() - hoursBefore * 3600_000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(deadlineDate);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function CreateScheduleDialog({ teamId, defaults }: CreateScheduleDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dateVal, setDateVal] = useState("");
  const [startTime, setStartTime] = useState(defaults?.startTime ?? "19:00");
  const [endTime, setEndTime] = useState(defaults?.endTime ?? "21:00");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [capacity, setCapacity] = useState<string>("");
  const [deadline, setDeadline] = useState("");
  // ユーザが締切を手動編集したら以後は自動同期を止める
  const [deadlineTouched, setDeadlineTouched] = useState(false);
  // 作成者自身の出欠（デフォルト: 参加）
  const [creatorStatus, setCreatorStatus] = useState<CreatorStatus>("attend");

  // 日付・開始時刻・デフォルト締切時間から自動計算
  useEffect(() => {
    if (deadlineTouched) return;
    const h = defaults?.deadlineHoursBefore;
    if (h == null || !dateVal || !startTime) {
      setDeadline("");
      return;
    }
    setDeadline(computeDeadline(dateVal, startTime, h));
  }, [dateVal, startTime, defaults?.deadlineHoursBefore, deadlineTouched]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateVal || !startTime || !location) return;

    const capacityNum = capacity.trim() === "" ? null : parseInt(capacity, 10);
    if (capacityNum !== null && (isNaN(capacityNum) || capacityNum < 1)) {
      toast.error("定員は1以上の数字を入力してください");
      return;
    }

    const dateStart = `${dateVal}T${startTime}:00+09:00`;
    const dateEnd = endTime ? `${dateVal}T${endTime}:00+09:00` : null;
    const deadlineISO = deadline ? deadline + ":00+09:00" : null;

    setLoading(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          date: dateStart,
          endDate: dateEnd,
          location,
          note,
          capacity: capacityNum,
          deadline: deadlineISO,
          creatorStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("createSchedule error:", res.status, data);
        toast.error(`${data.error || "日程の作成に失敗しました"}${data.detail ? `: ${data.detail}` : ""}`);
        return;
      }

      toast.success("日程を作成しました");
      setOpen(false);
      setDateVal("");
      setStartTime(defaults?.startTime ?? "19:00");
      setEndTime(defaults?.endTime ?? "21:00");
      setLocation("");
      setNote("");
      setCapacity("");
      setDeadline("");
      setDeadlineTouched(false);
      setCreatorStatus("attend");
      router.refresh();
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        + 新規日程
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新規日程を作成</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="date">日付</Label>
            <Input
              id="date"
              type="date"
              value={dateVal}
              onChange={(e) => setDateVal(e.target.value)}
              required
              className="w-[160px]"
            />
          </div>
          <div>
            <Label htmlFor="start-time">時間（終了は任意）</Label>
            <div className="flex items-center gap-2">
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-[110px]"
              />
              <span className="text-sm text-gray-400">〜</span>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-[110px]"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="location">場所</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={defaults?.locations?.[0] || "体育館、グラウンドなど"}
              required
            />
            {defaults?.locations && defaults.locations.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {defaults.locations.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocation(loc)}
                    className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    {loc}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="min-w-0">
              <Label htmlFor="capacity">定員（任意）</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  max={100}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="無制限"
                  className="w-full"
                />
                <span className="text-sm text-muted-foreground flex-shrink-0">人</span>
              </div>
            </div>
            <div className="min-w-0">
              <Label htmlFor="deadline">回答締切（任意）</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => {
                  setDeadline(e.target.value);
                  setDeadlineTouched(true);
                }}
                className="w-full"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="note">メモ（任意）</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="持ち物や注意事項など"
            />
          </div>

          {/* 作成者自身の出欠（回答忘れ防止。デフォルトは「参加」） */}
          <div className="space-y-2 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
            <Label className="text-sm">あなたの出欠</Label>
            <p className="text-xs text-gray-500">作成と同時に自分の回答も登録します。あとから変更可能です。</p>
            <div className={`grid gap-2 ${defaults?.allowTentative ? "grid-cols-3" : "grid-cols-2"}`}>
              <button
                type="button"
                onClick={() => setCreatorStatus("attend")}
                className={`h-10 rounded-lg border text-sm font-semibold transition-colors ${
                  creatorStatus === "attend"
                    ? "border-green-400 bg-green-500 text-white"
                    : "border-green-200 bg-white text-green-700 hover:bg-green-50"
                }`}
              >
                参加
              </button>
              {defaults?.allowTentative && (
                <button
                  type="button"
                  onClick={() => setCreatorStatus("tentative")}
                  className={`h-10 rounded-lg border text-sm font-semibold transition-colors ${
                    creatorStatus === "tentative"
                      ? "border-amber-400 bg-amber-500 text-white"
                      : "border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  検討中
                </button>
              )}
              <button
                type="button"
                onClick={() => setCreatorStatus("absent")}
                className={`h-10 rounded-lg border text-sm font-semibold transition-colors ${
                  creatorStatus === "absent"
                    ? "border-red-400 bg-red-500 text-white"
                    : "border-red-200 bg-white text-red-700 hover:bg-red-50"
                }`}
              >
                不参加
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "作成中..." : "作成"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
