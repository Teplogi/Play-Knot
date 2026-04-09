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

type CreateScheduleDialogProps = {
  teamId: string;
};

export function CreateScheduleDialog({ teamId }: CreateScheduleDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [capacity, setCapacity] = useState<string>("");

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
        body: JSON.stringify({ teamId, date, location, note, capacity: capacityNum }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "日程の作成に失敗しました");
        return;
      }

      toast.success("日程を作成しました");
      setOpen(false);
      setDate("");
      setLocation("");
      setNote("");
      setCapacity("");
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
            <Label htmlFor="date">日時</Label>
            <Input
              id="date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="location">場所</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="体育館、グラウンドなど"
              required
            />
          </div>
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
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">人（空欄なら無制限）</span>
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
