"use client";

import { useState, useEffect } from "react";
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

type CreateScheduleDialogProps = {
  teamId: string;
  defaults?: {
    startTime?: string;
    endTime?: string;
    deadlineHoursBefore?: number;
    locations?: string[];
  };
};

export function CreateScheduleDialog({ teamId, defaults }: CreateScheduleDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [capacity, setCapacity] = useState<string>("");
  const [deadline, setDeadline] = useState("");

  // ダイアログを開いた時にデフォルト値を適用
  useEffect(() => {
    if (open && defaults) {
      // 日付部分が入力済みならデフォルト時刻を適用
      if (date && defaults.startTime && !date.includes("T")) {
        setDate(date + "T" + defaults.startTime);
      }
    }
  }, [open]);

  // 開始日時が変わった時に終了時刻・締切を自動設定
  useEffect(() => {
    if (date && defaults?.endTime && !endDate) {
      const datePart = date.split("T")[0];
      if (datePart) {
        setEndDate(datePart + "T" + defaults.endTime);
      }
    }
  }, [date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !location) return;

    const capacityNum = capacity.trim() === "" ? null : parseInt(capacity, 10);
    if (capacityNum !== null && (isNaN(capacityNum) || capacityNum < 1)) {
      toast.error("定員は1以上の数字を入力してください");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          date: date + ":00+09:00",
          endDate: endDate ? endDate + ":00+09:00" : null,
          location,
          note,
          capacity: capacityNum,
          deadline: deadline ? deadline + ":00+09:00" : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "日程の作成に失敗しました");
        return;
      }

      toast.success("日程を作成しました");
      setOpen(false);
      setDate("");
      setEndDate("");
      setLocation("");
      setNote("");
      setCapacity("");
      setDeadline("");
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="date">開始日時</Label>
              <Input
                id="date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="end-date">終了日時（任意）</Label>
              <Input
                id="end-date"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
          <div className="grid grid-cols-2 gap-3">
            <div>
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
            <div>
              <Label htmlFor="deadline">回答締切（任意）</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
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
