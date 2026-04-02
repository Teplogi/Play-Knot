"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type InviteLinkProps = {
  teamId: string;
};

export function InviteLink({ teamId }: InviteLinkProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invite/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "招待リンクの生成に失敗しました");
        return;
      }

      const data = await res.json();
      setInviteUrl(data.inviteUrl);
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("コピーしました！");
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setInviteUrl(null);
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        招待リンクを発行
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>招待リンク</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!inviteUrl ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                招待リンクを生成すると、リンクを受け取った人がチームに参加できます。
                <br />
                有効期限は7日間です。
              </p>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? "生成中..." : "リンクを生成"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                以下のリンクをメンバーに共有してください。
              </p>
              <div className="flex gap-2">
                <Input value={inviteUrl} readOnly className="text-xs" />
                <Button onClick={handleCopy} variant="outline" className="shrink-0">
                  コピー
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">有効期限：7日間</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
