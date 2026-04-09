"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

/**
 * closestCorners は DragOverlay の矩形（親に transform があるとズレやすい）基準になる。
 * まずポインタ直下の droppable を使い、カラム(team-N)とメンバーが両方ヒットする場合はメンバーを優先する。
 */
const divideTeamCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    const memberHits = pointerHits.filter((h) => !String(h.id).startsWith("team-"));
    return memberHits.length > 0 ? memberHits : pointerHits;
  }
  return closestCorners(args);
};

type DivideResultStepProps = {
  teams: Member[][];
  hasNgViolation: boolean;
  onReshuffle: () => void;
};

function MemberCardContent({ member }: { member: Member }) {
  const genderBg = member.gender === "男" ? "bg-blue-100 text-blue-700" : member.gender === "女" ? "bg-pink-100 text-pink-700" : "bg-gray-100 text-gray-500";
  return (
    <div className="flex min-h-11 items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white border border-gray-100 shadow-sm cursor-grab select-none active:cursor-grabbing hover:shadow-md transition-shadow [-webkit-touch-callout:none]">
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

  // チームカラム自体を droppable にすることで、空カラムや余白へのドロップを受け付ける
  const droppableId = `team-${teamIndex}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  return (
    <div className={`rounded-xl border ${color.border} overflow-hidden`}>
      <div className={`${color.header} px-4 py-2.5 flex items-center justify-between`}>
        <span className={`text-sm font-bold ${color.headerText}`}>チーム {teamIndex + 1}</span>
        <span className={`text-xs ${color.headerText} opacity-80`}>{members.length}人</span>
      </div>
      <div
        ref={setNodeRef}
        className={`${color.bg} p-3 space-y-1.5 min-h-[80px] transition-colors ${isOver ? "ring-2 ring-indigo-400 ring-inset" : ""}`}
      >
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

export function DivideResultStep({ teams: initialTeams, hasNgViolation, onReshuffle }: DivideResultStepProps) {
  const [teams, setTeams] = useState<Member[][]>(initialTeams);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overlayMounted, setOverlayMounted] = useState(false);
  const { isHost } = useAuth();

  // 親から新しい分け結果が来たら反映する
  useEffect(() => {
    setTeams(initialTeams);
  }, [initialTeams]);

  useEffect(() => {
    setOverlayMounted(true);
  }, []);

  // マウス: わずかに動かしてからドラッグ（誤クリック防止）
  // タッチ: 長押しでドラッグ開始 → 縦スクロールと競合しにくい（@dnd-kit 推奨パターン）
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    })
  );
  const activeMember = activeId ? teams.flat().find((m) => m.id === activeId) : null;

  const findTeamIndex = useCallback(
    (memberId: string) => teams.findIndex((team) => team.some((m) => m.id === memberId)),
    [teams]
  );

  // over.id が "team-N" ならそのチーム index、メンバー id ならそのメンバーが属するチーム index
  const resolveOverTeamIndex = useCallback(
    (overId: string): number => {
      if (overId.startsWith("team-")) {
        const idx = parseInt(overId.slice(5), 10);
        return isNaN(idx) ? -1 : idx;
      }
      return findTeamIndex(overId);
    },
    [findTeamIndex]
  );

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  // ドラッグ中は配列を変更せず（レイアウト振動を避ける）、ドロップ時にまとめて反映する
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const activeTeamIdx = findTeamIndex(active.id as string);
    const overTeamIdx = resolveOverTeamIndex(over.id as string);
    if (activeTeamIdx === -1 || overTeamIdx === -1) return;

    const overId = over.id as string;

    setTeams((prev) => {
      const newTeams = prev.map((t) => [...t]);
      const member = newTeams[activeTeamIdx].find((m) => m.id === active.id);
      if (!member) return prev;
      newTeams[activeTeamIdx] = newTeams[activeTeamIdx].filter((m) => m.id !== active.id);

      if (overId.startsWith("team-")) {
        // コンテナ自身へのドロップ → 末尾に追加
        newTeams[overTeamIdx].push(member);
      } else {
        const overIndex = newTeams[overTeamIdx].findIndex((m) => m.id === overId);
        if (overIndex >= 0) {
          newTeams[overTeamIdx].splice(overIndex, 0, member);
        } else {
          newTeams[overTeamIdx].push(member);
        }
      }
      return newTeams;
    });
  };

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

      <p className="text-xs text-gray-400 text-right">
        ドラッグで移動（スマホはメンバーを長押ししてから）
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={divideTeamCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map((team, i) => (
            <TeamColumn key={i} teamIndex={i} members={team} />
          ))}
        </div>
        {overlayMounted &&
          createPortal(
            <DragOverlay dropAnimation={null} zIndex={1100}>
              {activeMember ? (
                <div className="shadow-xl shadow-indigo-200/50 rounded-lg">
                  <MemberCardContent member={activeMember} />
                </div>
              ) : null}
            </DragOverlay>,
            document.body
          )}
      </DndContext>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onReshuffle} className="rounded-xl" aria-label="再抽選">再抽選</Button>
      </div>
    </div>
  );
}
