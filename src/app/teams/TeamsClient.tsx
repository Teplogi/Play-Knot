"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/types";
import type { TeamRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";

type Team = {
  id: string;
  name: string;
  sportType: string;
  iconColor: string;
  memberCount: number;
  nextSchedule: string | null;
  created_at: string;
  role: string;
};

const ICON_BG: Record<string, string> = {
  indigo: "bg-indigo-600",
  emerald: "bg-emerald-600",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  violet: "bg-violet-600",
  cyan: "bg-cyan-600",
};

const ICON_BG_LIGHT: Record<string, string> = {
  indigo: "bg-indigo-50 group-hover:bg-indigo-100",
  emerald: "bg-emerald-50 group-hover:bg-emerald-100",
  amber: "bg-amber-50 group-hover:bg-amber-100",
  rose: "bg-rose-50 group-hover:bg-rose-100",
  violet: "bg-violet-50 group-hover:bg-violet-100",
  cyan: "bg-cyan-50 group-hover:bg-cyan-100",
};

const ICON_TEXT: Record<string, string> = {
  indigo: "text-indigo-600",
  emerald: "text-emerald-600",
  amber: "text-amber-600",
  rose: "text-rose-600",
  violet: "text-violet-600",
  cyan: "text-cyan-600",
};

export function TeamsClient({ userName, teams }: { userName: string; teams: Team[] }) {
  const { signOut } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newSportType, setNewSportType] = useState("");

  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newTeamName.trim()) {
      toast.error("チーム名を入力してください");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName, sportType: newSportType }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "チームの作成に失敗しました");
        return;
      }
      const team = await res.json();
      toast.success(`「${newTeamName}」を作成しました`);
      setCreateOpen(false);
      setNewTeamName("");
      setNewSportType("");
      // チーム一覧をリロードして新しいチームを表示
      window.location.href = "/teams";
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-gray-50">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Logo iconSize={28} textSize="sm" />
          <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-400" aria-label="ログアウト">
            ログアウト
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 animate-page-in">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              おかえりなさい{userName ? `、${userName}さん` : ""}
            </h1>
            <p className="text-gray-500 text-sm mt-1">チームを選択してください</p>
          </div>
          {teams.length > 0 && (
            <Button
              onClick={() => setCreateOpen(true)}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm h-9"
            >
              + 新規作成
            </Button>
          )}
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
            </div>
            <p className="text-gray-700 font-medium mb-1">まだチームに参加していません</p>
            <p className="text-sm text-gray-400 mb-6">チームを作成するか、招待リンクから参加できます</p>
            <Button
              onClick={() => setCreateOpen(true)}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 h-11 px-6"
            >
              チームを作成する
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => {
              const color = team.iconColor || "indigo";
              return (
                <Link key={team.id} href={`/teams/${team.id}`}>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-indigo-100 transition-all duration-200 cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${ICON_BG_LIGHT[color] ?? ICON_BG_LIGHT.indigo}`}>
                        <span className={`font-bold text-lg ${ICON_TEXT[color] ?? ICON_TEXT.indigo}`}>{team.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* 1行目: チーム名 + ロール */}
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 truncate">{team.name}</h3>
                          <Badge
                            variant="outline"
                            className={`text-[10px] flex-shrink-0 ${
                              team.role === "host"
                                ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                                : team.role === "co_host"
                                ? "bg-violet-50 text-violet-600 border-violet-200"
                                : "text-gray-500"
                            }`}
                          >
                            {ROLE_LABELS[team.role as TeamRole] ?? "ゲスト"}
                          </Badge>
                        </div>
                        {/* 2行目: スポーツ種別（あれば、はみ出したら省略） */}
                        {team.sportType && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{team.sportType}</p>
                        )}
                        {/* 3行目: 人数 + 次回日程（折返さず省略） */}
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 whitespace-nowrap overflow-hidden">
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>
                            {team.memberCount}人
                          </span>
                          {team.nextSchedule ? (
                            <span className="flex items-center gap-1 text-indigo-500 min-w-0 truncate">
                              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                              <span className="truncate">次回 {team.nextSchedule}</span>
                            </span>
                          ) : (
                            <span className="text-gray-300 flex-shrink-0">予定なし</span>
                          )}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* チーム作成ダイアログ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>チームを作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-team-name">チーム名</Label>
              <Input
                id="new-team-name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="例: バスケットボール部"
                maxLength={50}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-sport-type">スポーツ種別（任意）</Label>
              <Input
                id="new-sport-type"
                value={newSportType}
                onChange={(e) => setNewSportType(e.target.value)}
                placeholder="例: バスケットボール、フットサル"
                maxLength={30}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-lg">
              キャンセル
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newTeamName.trim() || creating}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700"
            >
              {creating ? "作成中..." : "作成する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
