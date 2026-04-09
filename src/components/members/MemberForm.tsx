"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { TeamMemberWithUser, TeamRole } from "@/types";

type MemberFormProps = {
  teamId: string;
  member?: TeamMemberWithUser;
  coHostCount: number;
  onUpdated: () => void;
  trigger: React.ReactNode;
};

export function MemberForm({ teamId, member, coHostCount, onUpdated, trigger }: MemberFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gender, setGender] = useState(member?.gender || "未設定");
  const [role, setRole] = useState<TeamRole>(member?.role || "guest");

  // co_host 上限チェック: 現在のメンバーが既に co_host なら自身は除外
  const currentIsCoHost = member?.role === "co_host";
  const canSelectCoHost = coHostCount - (currentIsCoHost ? 1 : 0) < 3;

  const isEdit = !!member;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit) {
        const res = await fetch(`/api/members/${member.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId, role, gender }),
        });

        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "更新に失敗しました");
          return;
        }

        toast.success("メンバー情報を更新しました");
      }

      setOpen(false);
      onUpdated();
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span className="contents" />}>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "メンバー編集" : "メンバー追加"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isEdit && (
            <div>
              <Label className="text-sm font-medium">名前</Label>
              <p className="text-sm mt-1">{member.users.name}</p>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium mb-2 block">性別</Label>
            <Select value={gender} onValueChange={(v) => v && setGender(v as typeof gender)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="男">男</SelectItem>
                <SelectItem value="女">女</SelectItem>
                <SelectItem value="未設定">未設定</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">役割</Label>
            <Select value={role} onValueChange={(v) => v && setRole(v as TeamRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="host">ホスト</SelectItem>
                <SelectItem value="co_host" disabled={!canSelectCoHost}>
                  共同ホスト{!canSelectCoHost ? "（上限3名）" : ""}
                </SelectItem>
                <SelectItem value="guest">ゲスト</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
