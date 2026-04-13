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
import { ROLE_LABELS, type TeamMemberWithUser, type TeamRole } from "@/types";

type MemberFormProps = {
  teamId: string;
  member?: TeamMemberWithUser;
  coHostCount: number;
  onUpdated: () => void;
  trigger: React.ReactNode;
};

// 共同ホストに付与される権限の説明（migration 005 と RLS ポリシーに準拠）
const CO_HOST_PERMISSIONS = [
  "メンバーの追加・編集・削除",
  "招待リンクの発行",
  "日程の作成・編集・削除",
  "NGリストの追加・削除",
  "チーム基本情報・設定の編集",
];

// 役割選択用の編集可能ロール（host は譲渡経由のみ変更可なので除外）
type EditableRole = "co_host" | "guest";

export function MemberForm({ teamId, member, coHostCount, onUpdated, trigger }: MemberFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const initialRole: EditableRole = member?.role === "co_host" ? "co_host" : "guest";
  const [role, setRole] = useState<EditableRole>(initialRole);
  const [confirmCoHost, setConfirmCoHost] = useState(false);

  // co_host 上限チェック: 現在のメンバーが既に co_host なら自身は除外
  const currentIsCoHost = member?.role === "co_host";
  const canSelectCoHost = coHostCount - (currentIsCoHost ? 1 : 0) < 3;

  const isEdit = !!member;
  const isCurrentHost = member?.role === "host";

  const submit = async () => {
    if (!isEdit) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "更新に失敗しました");
        return;
      }

      toast.success("メンバー情報を更新しました");
      setOpen(false);
      setConfirmCoHost(false);
      onUpdated();
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 共同ホストに昇格させる場合は確認画面へ
    const isPromotingToCoHost = role === "co_host" && member?.role !== "co_host";
    if (isPromotingToCoHost) {
      setConfirmCoHost(true);
      return;
    }
    submit();
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setConfirmCoHost(false);
      setRole(initialRole);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<span className="contents" />}>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {confirmCoHost ? "共同ホストへの変更を確認" : isEdit ? "メンバー編集" : "メンバー追加"}
          </DialogTitle>
        </DialogHeader>

        {confirmCoHost ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-900">
                {member?.users.name} さんを共同ホストに変更します
              </p>
              <p className="text-xs text-amber-800 mt-1">
                共同ホストには以下の権限が付与されます。本当に変更してよいか確認してください。
              </p>
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 pl-1">
              {CO_HOST_PERMISSIONS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="text-xs text-gray-500">
              ※ チームの削除とオーナー譲渡はホストのみ実行できます。
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmCoHost(false)}
                disabled={loading}
              >
                戻る
              </Button>
              <Button type="button" onClick={submit} disabled={loading}>
                {loading ? "変更中..." : "共同ホストに変更"}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isEdit && (
              <div>
                <Label className="text-sm font-medium">名前</Label>
                <p className="text-sm mt-1">{member.users.name}</p>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium mb-2 block">役割</Label>
              {isCurrentHost ? (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 space-y-1">
                  <p className="text-sm font-semibold text-indigo-900">ホスト</p>
                  <p className="text-xs text-indigo-700">
                    ホストの変更はチーム設定 → オーナー譲渡から行ってください。
                  </p>
                </div>
              ) : (
                <Select value={role} onValueChange={(v) => v && setRole(v as EditableRole)}>
                  <SelectTrigger>
                    <SelectValue>{(v) => ROLE_LABELS[v as TeamRole] ?? ""}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="co_host" disabled={!canSelectCoHost}>
                      共同ホスト{!canSelectCoHost ? "（上限3名）" : ""}
                    </SelectItem>
                    <SelectItem value="guest">ゲスト</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={loading || isCurrentHost || role === initialRole}>
                {loading ? "保存中..." : "保存"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
