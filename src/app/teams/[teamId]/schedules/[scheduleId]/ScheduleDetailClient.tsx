"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { AttendanceForm } from "@/components/attendance/AttendanceForm";
import { AttendanceList } from "@/components/attendance/AttendanceList";
import { EditScheduleDialog } from "@/components/schedule/EditScheduleDialog";
import { SavedDivisionDialog } from "@/components/schedule/SavedDivisionDialog";
import { AddGuestButton } from "@/components/guests/AddGuestButton";
import type {
  Schedule,
  AttendanceWithUser,
  SavedTeamDivision,
  ScheduleGuestWithGuest,
  TeamGuest,
} from "@/types";

type Props = {
  schedule: Schedule;
  attendances: AttendanceWithUser[];
  totalMembers: number;
  myAttendance: AttendanceWithUser | null;
  canManageSchedule: boolean;
  teamId: string;
  allowTentative: boolean;
  invitedGuests: ScheduleGuestWithGuest[];
  teamGuests: TeamGuest[];
  /** この日程に保存されているチーム分け結果 (なければ null) */
  savedDivision: SavedTeamDivision | null;
};

/**
 * シンプルな表形式の詳細行。場所/定員/締切/チーム/メモを同じ見た目で並べる。
 * 4 色アイコンバッジをやめて視覚的なノイズを抑えた。
 */
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3 px-5 py-3">
      <span className="text-xs font-semibold text-gray-500 tracking-wider w-12 flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 text-sm text-gray-900 min-w-0">{children}</div>
    </div>
  );
}

/** カードヘッダー (シンプル) */
function SectionHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between gap-2">
      <p className="text-sm font-semibold text-gray-700 tracking-wide">{title}</p>
      {right}
    </div>
  );
}

export function ScheduleDetailClient({
  schedule,
  attendances,
  totalMembers,
  myAttendance,
  canManageSchedule,
  teamId,
  allowTentative,
  invitedGuests,
  teamGuests,
  savedDivision,
}: Props) {
  const router = useRouter();
  const [teamsDialogOpen, setTeamsDialogOpen] = useState(false);

  const memberAttendCount = attendances.filter((a) => a.status === "attend").length;
  const guestAttendCount = invitedGuests.length;
  const attendCount = memberAttendCount + guestAttendCount;

  const myUserId = myAttendance?.user_id ?? null;
  const othersAttendCount =
    attendances.filter((a) => a.status === "attend" && a.user_id !== myUserId).length +
    guestAttendCount;
  const isFull = schedule.capacity !== null && attendCount >= schedule.capacity;

  const date = new Date(schedule.date);
  const endDate = schedule.end_date ? new Date(schedule.end_date) : null;

  // 招集に出せるゲスト = team_guests から既に invited のものを除いた分
  const availableGuests = useMemo(() => {
    const invitedIds = new Set(invitedGuests.map((g) => g.guest_id));
    return teamGuests.filter((g) => !invitedIds.has(g.id));
  }, [teamGuests, invitedGuests]);

  return (
    <div className="space-y-4">
      {/* ヘッダー: 戻る + 編集 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(`/teams/${teamId}/schedules`)}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          日程一覧に戻る
        </button>
        {canManageSchedule && <EditScheduleDialog schedule={schedule} />}
      </div>

      {/* 日程情報カード */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/*
          日付・時間ヒーロー。原色べったりではなく、薄い indigo-50 背景 +
          slate 寄りの indigo-900 文字でくすんだトーンに。
        */}
        <div className="bg-indigo-50/60 border-b border-indigo-100/70 px-5 py-4">
          <p className="text-2xl font-bold text-indigo-950 leading-tight tracking-tight">
            {format(date, "M月d日", { locale: ja })}
            <span className="text-indigo-700/70 text-base font-medium ml-2">
              ({format(date, "E", { locale: ja })})
            </span>
          </p>
          <p className="text-indigo-900/85 text-base font-semibold mt-1 flex items-center gap-1.5 tabular-nums">
            <svg className="w-4 h-4 text-indigo-600/70" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {format(date, "HH:mm")}
            {endDate && <span className="text-indigo-800/70"> 〜 {format(endDate, "HH:mm")}</span>}
          </p>
        </div>

        {/* 詳細行 (ミニマルなテーブル風) */}
        <dl className="divide-y divide-gray-100">
          <DetailRow label="場所">{schedule.location}</DetailRow>

          {schedule.capacity !== null && (
            <DetailRow label="定員">
              <div className="flex items-center gap-2 flex-wrap">
                <span>
                  {attendCount} / {schedule.capacity} 人
                </span>
                {isFull ? (
                  <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs">満員</Badge>
                ) : (
                  <Badge className="bg-gray-50 text-gray-600 border border-gray-200 text-xs">
                    残り {schedule.capacity - attendCount}
                  </Badge>
                )}
              </div>
            </DetailRow>
          )}

          {schedule.deadline && (
            <DetailRow label="締切">
              <span className="tabular-nums">
                {format(new Date(schedule.deadline), "M月d日(E) HH:mm", { locale: ja })}
              </span>
            </DetailRow>
          )}

          {/* チーム確定状況 - クリックで確定チームダイアログを開く */}
          <DetailRow label="チーム">
            {savedDivision ? (
              <button
                type="button"
                onClick={() => setTeamsDialogOpen(true)}
                className="inline-flex items-center gap-1.5 text-indigo-700 hover:text-indigo-900 hover:underline"
                aria-label="確定チームを表示"
              >
                <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs">
                  決定済み
                </Badge>
                <span className="text-sm">{savedDivision.teams.length} チーム</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            ) : (
              <span className="text-gray-500">未決定</span>
            )}
          </DetailRow>

          {schedule.note && (
            <DetailRow label="メモ">
              <p className="whitespace-pre-wrap break-words">{schedule.note}</p>
            </DetailRow>
          )}
        </dl>
      </div>

      {/* 出欠回答カード */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="出欠回答" />
        <div className="p-5">
          <AttendanceForm
            scheduleId={schedule.id}
            currentStatus={myAttendance?.status || null}
            currentComment={myAttendance?.comment || ""}
            onUpdated={() => router.refresh()}
            scheduleDate={schedule.date}
            deadline={schedule.deadline}
            capacity={schedule.capacity}
            othersAttendCount={othersAttendCount}
            allowTentative={allowTentative}
          />
        </div>
      </div>

      {/* 出欠一覧カード (ゲスト招集を統合) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader
          title="出欠一覧"
          right={
            canManageSchedule ? (
              <AddGuestButton
                scheduleId={schedule.id}
                availableGuests={availableGuests}
                onUpdated={() => router.refresh()}
              />
            ) : null
          }
        />
        <div className="p-5">
          <AttendanceList
            attendances={attendances}
            totalMembers={totalMembers}
            invitedGuests={invitedGuests}
            canManageGuests={canManageSchedule}
            onGuestRemoved={() => router.refresh()}
          />
        </div>
      </div>

      {/* 確定チーム ダイアログ */}
      {savedDivision && (
        <SavedDivisionDialog
          open={teamsDialogOpen}
          onOpenChange={setTeamsDialogOpen}
          division={savedDivision}
          canManage={canManageSchedule}
          scheduleId={schedule.id}
        />
      )}
    </div>
  );
}
