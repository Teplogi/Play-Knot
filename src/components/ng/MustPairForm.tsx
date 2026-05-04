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

type MemberOption = { id: string; name: string };

type MustPairFormProps = {
  teamId: string;
  members: MemberOption[];
  /** 既に must_pair に登録されている user_id 集合（chain 防止のため選択不可にする） */
  lockedMemberIds: Set<string>;
  onAdded: () => void;
};

export function MustPairForm({
  teamId,
  members,
  lockedMemberIds,
  onAdded,
}: MustPairFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userIdA, setUserIdA] = useState<string>("");
  const [userIdB, setUserIdB] = useState<string>("");

  const error =
    userIdA && userIdB && userIdA === userIdB ? "同じメンバーは選択できません" : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userIdA || !userIdB || error) return;

    setLoading(true);
    try {
      const res = await fetch("/api/must-pairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, userIdA, userIdB }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "追加に失敗しました");
        return;
      }

      toast.success("ペアを追加しました");
      setOpen(false);
      setUserIdA("");
      setUserIdB("");
      onAdded();
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-emerald-600 hover:bg-emerald-700">+ ペアを追加</Button>
        }
      >
        + ペアを追加
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>必ず同じチームになるペアを追加</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            選択した 2 人は、両方が参加した場合に必ず同じチームに入ります。
            <br />
            既に他のペアに登録されているメンバーは選択できません。
          </p>
          <div>
            <Label className="text-sm font-medium mb-2 block">メンバー1</Label>
            <Select value={userIdA} onValueChange={(v) => v && setUserIdA(v)}>
              <SelectTrigger>
                <SelectValue placeholder="選択してください">
                  {(v) => members.find((m) => m.id === v)?.name ?? ""}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id} disabled={lockedMemberIds.has(m.id)}>
                    {m.name}
                    {lockedMemberIds.has(m.id) ? "（登録済み）" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-center text-emerald-600 text-lg font-bold">＝</div>

          <div>
            <Label className="text-sm font-medium mb-2 block">メンバー2</Label>
            <Select value={userIdB} onValueChange={(v) => v && setUserIdB(v)}>
              <SelectTrigger>
                <SelectValue placeholder="選択してください">
                  {(v) => members.find((m) => m.id === v)?.name ?? ""}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {members
                  .filter((m) => m.id !== userIdA)
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id} disabled={lockedMemberIds.has(m.id)}>
                      {m.name}
                      {lockedMemberIds.has(m.id) ? "（登録済み）" : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={loading || !userIdA || !userIdB || !!error}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? "追加中..." : "追加"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
