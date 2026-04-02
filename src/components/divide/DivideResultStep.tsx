"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import type { Member } from "@/lib/divide/algorithm";

// チームごとの背景色
const TEAM_COLORS = [
  { bg: "bg-indigo-50", border: "border-indigo-100", header: "bg-indigo-600", headerText: "text-white" },
  { bg: "bg-emerald-50", border: "border-emerald-100", header: "bg-emerald-600", headerText: "text-white" },
  { bg: "bg-amber-50", border: "border-amber-100", header: "bg-amber-500", headerText: "text-white" },
  { bg: "bg-rose-50", border: "border-rose-100", header: "bg-rose-500", headerText: "text-white" },
  { bg: "bg-violet-50", border: "border-violet-100", header: "bg-violet-600", headerText: "text-white" },
  { bg: "bg-cyan-50", border: "border-cyan-100", header: "bg-cyan-600", headerText: "text-white" },
];

function getTeamColor(index: number) {
  return TEAM_COLORS[index % TEAM_COLORS.length];
}

type DivideResultStepProps = {
  teams: Member[][];
  hasNgViolation: boolean;
  onBack: () => void;
  onReshuffle: () => void;
};

function MemberCardContent({ member }: { member: Member }) {
  const genderBg = member.gender === "男" ? "bg-blue-100 text-blue-700" : member.gender === "女" ? "bg-pink-100 text-pink-700" : "bg-gray-100 text-gray-500";
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white border border-gray-100 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${genderBg}`}>
        {member.name.charAt(0)}
      </div>
      <span className="text-sm font-medium text-gray-900 flex-1 truncate">{member.name}</span>
      {member.isDummy && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">助っ人</Badge>}
    </div>
  );
}

function SortableMemberCard({ member }: { member: Member }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: member.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <MemberCardContent member={member} />
    </div>
  );
}

function TeamColumn({ teamIndex, members }: { teamIndex: number; members: Member[] }) {
  const color = getTeamColor(teamIndex);
  const maleCount = members.filter((m) => m.gender === "男").length;
  const femaleCount = members.filter((m) => m.gender === "女").length;

  return (
    <div className={`rounded-xl border ${color.border} overflow-hidden`}>
      <div className={`${color.header} px-4 py-2.5 flex items-center justify-between`}>
        <span className={`text-sm font-bold ${color.headerText}`}>チーム {teamIndex + 1}</span>
        <span className={`text-xs ${color.headerText} opacity-80`}>{members.length}人</span>
      </div>
      <div className={`${color.bg} p-3 space-y-1.5 min-h-[60px]`}>
        <SortableContext items={members.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          {members.map((member) => (
            <SortableMemberCard key={member.id} member={member} />
          ))}
        </SortableContext>
        {(maleCount > 0 || femaleCount > 0) && (
          <div className="flex gap-2 pt-1 text-[10px] text-gray-400">
            {maleCount > 0 && <span>男 {maleCount}</span>}
            {femaleCount > 0 && <span>女 {femaleCount}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export function DivideResultStep({ teams: initialTeams, hasNgViolation, onBack, onReshuffle }: DivideResultStepProps) {
  const [teams, setTeams] = useState<Member[][]>(initialTeams);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { isHost } = useAuth();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const activeMember = activeId ? teams.flat().find((m) => m.id === activeId) : null;

  const findTeamIndex = useCallback(
    (memberId: string) => teams.findIndex((team) => team.some((m) => m.id === memberId)),
    [teams]
  );

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeTeamIdx = findTeamIndex(active.id as string);
    const overTeamIdx = findTeamIndex(over.id as string);
    if (activeTeamIdx === -1 || overTeamIdx === -1 || activeTeamIdx === overTeamIdx) return;

    setTeams((prev) => {
      const newTeams = prev.map((t) => [...t]);
      const member = newTeams[activeTeamIdx].find((m) => m.id === active.id);
      if (!member) return prev;
      newTeams[activeTeamIdx] = newTeams[activeTeamIdx].filter((m) => m.id !== active.id);
      const overIndex = newTeams[overTeamIdx].findIndex((m) => m.id === over.id);
      if (overIndex >= 0) { newTeams[overTeamIdx].splice(overIndex, 0, member); } else { newTeams[overTeamIdx].push(member); }
      return newTeams;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const activeTeamIdx = findTeamIndex(active.id as string);
    const overTeamIdx = findTeamIndex(over.id as string);
    if (activeTeamIdx === overTeamIdx && activeTeamIdx !== -1) {
      setTeams((prev) => {
        const newTeams = prev.map((t) => [...t]);
        const team = newTeams[activeTeamIdx];
        const oldIndex = team.findIndex((m) => m.id === active.id);
        const newIndex = team.findIndex((m) => m.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          const [moved] = team.splice(oldIndex, 1);
          team.splice(newIndex, 0, moved);
        }
        return newTeams;
      });
    }
  };

  if (confirmed) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
          <svg className="w-6 h-6 text-green-600 mx-auto mb-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-green-800 font-semibold">チーム分けが確定しました</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map((team, i) => (
            <TeamColumn key={i} teamIndex={i} members={team} />
          ))}
        </div>
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={onBack} className="rounded-xl">最初からやり直す</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasNgViolation && (
        <div className="rounded-xl bg-orange-50 border border-orange-200 p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
          <p className="text-sm text-orange-800">
            {isHost()
              ? "一部、条件が合わない部分があります。内容を確認して手動で調整してください。"
              : "一部、条件が合わない部分があります。ホストに確認してください。"}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">チーム分け結果</h3>
        <p className="text-xs text-gray-400">ドラッグ&ドロップで移動可能</p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map((team, i) => (
            <TeamColumn key={i} teamIndex={i} members={team} />
          ))}
        </div>
        <DragOverlay>
          {activeMember ? (
            <div className="shadow-xl shadow-indigo-200/50 rounded-lg scale-105">
              <MemberCardContent member={activeMember} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* 固定フッター */}
      <div className="sticky bottom-16 md:bottom-0 bg-white/90 backdrop-blur-md rounded-xl border border-gray-100 shadow-lg p-3 flex justify-between">
        <Button variant="outline" onClick={onBack} className="rounded-xl" aria-label="設定に戻る">← 戻る</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReshuffle} className="rounded-xl" aria-label="再抽選">再抽選</Button>
          <Button onClick={() => setShowConfirmDialog(true)} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6" aria-label="確定する">確定する</Button>
        </div>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>チーム分けを確定しますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">確定すると全メンバーがチーム分け結果を閲覧できます。</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="rounded-xl">キャンセル</Button>
            <Button onClick={() => { setShowConfirmDialog(false); setConfirmed(true); }} className="rounded-xl bg-indigo-600 hover:bg-indigo-700">確定</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
