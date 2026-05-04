"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GuestForm } from "./GuestForm";
import { toast } from "sonner";
import type { TeamGuest } from "@/types";

type GuestListProps = {
  teamId: string;
  guests: TeamGuest[];
  canManage: boolean;
  onUpdated: () => void;
};

export function GuestList({ teamId, guests, canManage, onUpdated }: GuestListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (guest: TeamGuest) => {
    if (!confirm(`${guest.name} を助っ人一覧から削除しますか？`)) return;
    setDeletingId(guest.id);
    try {
      const res = await fetch(`/api/team-guests/${guest.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "削除に失敗しました");
        return;
      }
      toast.success("助っ人を削除しました");
      onUpdated();
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setDeletingId(null);
    }
  };

  if (guests.length === 0) {
    return (
      <p className="text-center text-gray-400 py-6 text-sm">
        助っ人はまだ登録されていません
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {guests.map((guest) => {
        const genderBg =
          guest.gender === "男"
            ? "bg-blue-100 text-blue-700"
            : guest.gender === "女"
            ? "bg-pink-100 text-pink-700"
            : "bg-gray-100 text-gray-500";
        return (
          <div
            key={guest.id}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${genderBg}`}
              >
                {guest.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{guest.name}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  {guest.gender !== "未設定" && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${
                        guest.gender === "男"
                          ? "bg-blue-50 text-blue-600 border-blue-200"
                          : "bg-pink-50 text-pink-600 border-pink-200"
                      }`}
                    >
                      {guest.gender}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200"
                  >
                    助っ人
                  </Badge>
                </div>
              </div>
            </div>
            {canManage && (
              <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-gray-50">
                <GuestForm
                  teamId={teamId}
                  guest={guest}
                  onUpdated={onUpdated}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-indigo-600 h-7 text-xs"
                    >
                      編集
                    </Button>
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-red-500 h-7 text-xs"
                  onClick={() => handleDelete(guest)}
                  disabled={deletingId === guest.id}
                  aria-label={`${guest.name}を削除`}
                >
                  削除
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
