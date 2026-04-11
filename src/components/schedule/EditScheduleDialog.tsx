"use client";

import { useState } from "react";
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
import type { Schedule } from "@/types";

type EditScheduleDialogProps = {
  schedule: Schedule;
};

function toJSTDate(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toJSTTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function EditScheduleDialog({ schedule }: EditScheduleDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [dateVal, setDateVal] = useState(toJSTDate(schedule.date));
  const [startTime, setStartTime] = useState(toJSTTime(schedule.date));
  const [endTime, setEndTime] = useState(schedule.end_date ? toJSTTime(schedule.end_date) : "");
  const [location, setLocation] = useState(schedule.location);
  const [note, setNote] = useState(schedule.note || "");
  const [capacity, setCapacity] = useState<string>(
    schedule.capacity !== null && schedule.capacity !== undefined ? String(schedule.capacity) : ""
  );
  const [deadline, setDeadline] = useState(() => {
    if (!schedule.deadline) return "";
    const d = new Date(schedule.deadline);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  });

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
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: schedule.id,
          teamId: schedule.team_id,
          date: dateStart,
          endDate: dateEnd,
          location,
          note,
          capacity: capacityNum,
          deadline: deadlineISO,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "日程の更新に失敗しました");
        return;
      }

      toast.success("日程を更新しました");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("この日程を削除しますか？関連する出欠データも削除されます。")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: schedule.id,
          teamId: schedule.team_id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "日程の削除に失敗しました");
        return;
      }

      toast.success("日程を削除しました");
      router.push(`/teams/${schedule.team_id}/schedules`);
      router.refresh();
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        編集
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>日程を編集</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-date">日付</Label>
            <Input
              id="edit-date"
              type="date"
              value={dateVal}
              onChange={(e) => setDateVal(e.target.value)}
              required
              className="w-[160px]"
            />
          </div>
          <div>
            <Label htmlFor="edit-start-time">時間（終了は任意）</Label>
            <div className="flex items-center gap-2">
              <Input
                id="edit-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-[110px]"
              />
              <span className="text-sm text-gray-400">〜</span>
              <Input
                id="edit-end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-[110px]"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="edit-location">場所</Label>
            <Input
              id="edit-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="min-w-0">
              <Label htmlFor="edit-capacity">定員（任意）</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-capacity"
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
              <Label htmlFor="edit-deadline">回答締切（任意）</Label>
              <Input
                id="edit-deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="edit-note">メモ（任意）</Label>
            <Input
              id="edit-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              削除
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "更新中..." : "更新"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
