"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MemberForm } from "./MemberForm";
import { toast } from "sonner";
import type { TeamMemberWithUser } from "@/types";
import { ROLE_LABELS } from "@/types";

type MemberListProps = {
  members: TeamMemberWithUser[];
  teamId: string;
  onUpdated: () => void;
};

export function MemberList({ members, teamId, onUpdated }: MemberListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const coHostCount = members.filter((m) => m.role === "co_host").length;

  const handleDelete = async (member: TeamMemberWithUser) => {
    if (!confirm(`${member.users.name} をチームから削除しますか？`)) return;
    setDeletingId(member.id);
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      if (!res.ok) { const data = await res.json(); toast.error(data.error || "削除に失敗しました"); return; }
      toast.success("メンバーを削除しました");
      onUpdated();
    } catch { toast.error("エラーが発生しました"); } finally { setDeletingId(null); }
  };

  if (members.length === 0) {
    return <p className="text-center text-gray-400 py-12 text-sm">メンバーがいません</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {members.map((member) => {
        const genderBg = member.gender === "男" ? "bg-blue-100 text-blue-700" : member.gender === "女" ? "bg-pink-100 text-pink-700" : "bg-gray-100 text-gray-500";
        return (
          <div key={member.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              {/* アバター */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${genderBg}`}>
                {member.users.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{member.users.name}</p>
                <p className="text-xs text-gray-400 truncate">{member.users.email}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  {member.gender !== "未設定" && (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${member.gender === "男" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-pink-50 text-pink-600 border-pink-200"}`}>
                      {member.gender}
                    </Badge>
                  )}
                  <Badge
                    variant={member.role === "guest" ? "secondary" : "default"}
                    className={`text-[10px] px-1.5 py-0 ${
                      member.role === "host"
                        ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                        : member.role === "co_host"
                        ? "bg-violet-100 text-violet-700 border-violet-200"
                        : ""
                    }`}
                  >
                    {ROLE_LABELS[member.role]}
                  </Badge>
                  <span className="text-[10px] text-gray-300 ml-auto">
                    {format(new Date(member.created_at), "yyyy/M/d", { locale: ja })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-gray-50">
              <MemberForm
                teamId={teamId}
                member={member}
                coHostCount={coHostCount}
                onUpdated={onUpdated}
                trigger={<Button variant="ghost" size="sm" className="text-gray-400 hover:text-indigo-600 h-7 text-xs">編集</Button>}
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-red-500 h-7 text-xs"
                onClick={() => handleDelete(member)}
                disabled={deletingId === member.id}
                aria-label={`${member.users.name}を削除`}
              >
                削除
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
