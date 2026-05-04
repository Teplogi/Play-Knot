"use client";

import { useState } from "react";
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
import type { TeamGuest } from "@/types";

type Gender = "男" | "女" | "未設定";

type GuestFormProps = {
  teamId: string;
  guest?: TeamGuest;
  onUpdated: () => void;
  trigger: React.ReactNode;
};

export function GuestForm({ teamId, guest, onUpdated, trigger }: GuestFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(guest?.name ?? "");
  const [gender, setGender] = useState<Gender>(guest?.gender ?? "未設定");

  const isEdit = !!guest;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setName(guest?.name ?? "");
      setGender(guest?.gender ?? "未設定");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("名前を入力してください");
      return;
    }

    setLoading(true);
    try {
      const res = isEdit
        ? await fetch(`/api/team-guests/${guest.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: trimmed, gender }),
          })
        : await fetch(`/api/team-guests`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teamId, name: trimmed, gender }),
          });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "保存に失敗しました");
        return;
      }

      toast.success(isEdit ? "助っ人を更新しました" : "助っ人を追加しました");
      setOpen(false);
      onUpdated();
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<span className="contents" />}>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "助っ人を編集" : "助っ人を追加"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guest-name">名前</Label>
            <Input
              id="guest-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="名前を入力"
              autoFocus
              maxLength={40}
            />
          </div>
          <div className="space-y-2">
            <Label>性別</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["男", "女", "未設定"] as Gender[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
                    gender === g
                      ? g === "男"
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : g === "女"
                        ? "border-pink-400 bg-pink-50 text-pink-700"
                        : "border-indigo-400 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="rounded-lg"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
