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
type MemberOption = {
  id: string;
  name: string;
};

type NgPairFormProps = {
  teamId: string;
  members: MemberOption[];
  onAdded: () => void;
};

export function NgPairForm({ teamId, members, onAdded }: NgPairFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userIdA, setUserIdA] = useState<string>("");
  const [userIdB, setUserIdB] = useState<string>("");

  const error =
    userIdA && userIdB && userIdA === userIdB
      ? "同じメンバーは選択できません"
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userIdA || !userIdB || error) return;

    setLoading(true);
    try {
      const res = await fetch("/api/ng-pairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, userIdA, userIdB }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "追加に失敗しました");
        return;
      }

      toast.success("NGペアを追加しました");
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
      <DialogTrigger render={<Button />}>
        + NG組み合わせを追加
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>NG組み合わせを追加</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">メンバー1</Label>
            <Select value={userIdA} onValueChange={(v) => v && setUserIdA(v)}>
              <SelectTrigger>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-center text-muted-foreground text-lg">×</div>

          <div>
            <Label className="text-sm font-medium mb-2 block">メンバー2</Label>
            <Select value={userIdB} onValueChange={(v) => v && setUserIdB(v)}>
              <SelectTrigger>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {members
                  .filter((m) => m.id !== userIdA)
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
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
            <Button type="submit" disabled={loading || !userIdA || !userIdB || !!error}>
              {loading ? "追加中..." : "追加"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
