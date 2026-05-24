"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { SavedTeamDivision, SavedTeamDivisionMember } from "@/types";

const TEAM_COLORS = [
  { bg: "bg-indigo-50", border: "border-indigo-100", header: "bg-indigo-600" },
  { bg: "bg-emerald-50", border: "border-emerald-100", header: "bg-emerald-600" },
  { bg: "bg-amber-50", border: "border-amber-100", header: "bg-amber-500" },
  { bg: "bg-rose-50", border: "border-rose-100", header: "bg-rose-500" },
  { bg: "bg-violet-50", border: "border-violet-100", header: "bg-violet-600" },
  { bg: "bg-cyan-50", border: "border-cyan-100", header: "bg-cyan-600" },
] as const;

function MemberRow({ member }: { member: SavedTeamDivisionMember }) {
  const genderBg =
    member.gender === "男"
      ? "bg-blue-100 text-blue-700"
      : member.gender === "女"
      ? "bg-pink-100 text-pink-700"
      : "bg-gray-100 text-gray-500";
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white border border-gray-100">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${genderBg}`}>
        {member.name.charAt(0)}
      </div>
      <span className="text-sm font-medium text-gray-900 flex-1 truncate">{member.name}</span>
      {member.isDummy && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">助っ人</Badge>
      )}
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  division: SavedTeamDivision;
  canManage: boolean;
  scheduleId: string;
};

export function SavedDivisionDialog({
  open,
  onOpenChange,
  division,
  canManage,
  scheduleId,
}: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const total = division.teams.reduce((sum, t) => sum + t.length, 0);
  const updatedAt = new Date(division.updated_at);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/saved-teams?scheduleId=${encodeURIComponent(scheduleId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "削除に失敗しました");
        return;
      }
      toast.success("確定チームを削除しました");
      setConfirmOpen(false);
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              確定チーム
              <span className="text-xs text-gray-500 font-normal ml-2">
                {division.teams.length} チーム / {total} 人 ・ {format(updatedAt, "M月d日 HH:mm", { locale: ja })} 更新
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2 max-h-[60vh] overflow-y-auto py-1">
            {division.teams.map((team, i) => {
              const color = TEAM_COLORS[i % TEAM_COLORS.length];
              const maleCount = team.filter((m) => m.gender === "男").length;
              const femaleCount = team.filter((m) => m.gender === "女").length;
              return (
                <div key={i} className={`rounded-xl border ${color.border} overflow-hidden`}>
                  <div className={`${color.header} px-3 py-1.5 flex items-center justify-between`}>
                    <span className="text-sm font-bold text-white">チーム {i + 1}</span>
                    <span className="text-xs text-white/80">{team.length}人</span>
                  </div>
                  <div className={`${color.bg} p-2 space-y-1`}>
                    {team.length === 0 ? (
                      <p className="text-xs text-gray-500 px-1 py-1.5">メンバーなし</p>
                    ) : (
                      team.map((m) => <MemberRow key={m.id} member={m} />)
                    )}
                    {(maleCount > 0 || femaleCount > 0) && (
                      <div className="flex gap-2 pt-1 text-[10px] text-gray-500">
                        {maleCount > 0 && <span>男 {maleCount}</span>}
                        {femaleCount > 0 && <span>女 {femaleCount}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            {canManage && (
              <Button
                variant="ghost"
                onClick={() => setConfirmOpen(true)}
                className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 mr-auto"
              >
                削除
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認 */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">確定チームを削除しますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 leading-relaxed">
            この日程に保存されているチーム編成を削除します。元に戻すには、チーム分け画面から再度保存してください。
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
              className="rounded-lg"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg bg-red-600 hover:bg-red-700"
            >
              {deleting ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
