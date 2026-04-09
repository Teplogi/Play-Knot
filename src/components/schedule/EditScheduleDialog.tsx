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

export function EditScheduleDialog({ schedule }: EditScheduleDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // datetime-localの形式に変換
  const initialDate = new Date(schedule.date).toISOString().slice(0, 16);
  const [date, setDate] = useState(initialDate);
  const [location, setLocation] = useState(schedule.location);
  const [note, setNote] = useState(schedule.note || "");
  const [capacity, setCapacity] = useState<string>(
    schedule.capacity !== null && schedule.capacity !== undefined ? String(schedule.capacity) : ""
  );

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
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: schedule.id,
          teamId: schedule.team_id,
          date,
          location,
          note,
          capacity: capacityNum,
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
            <Label htmlFor="edit-date">日時</Label>
            <Input
              id="edit-date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
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
          <div>
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
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">人（空欄なら無制限）</span>
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
