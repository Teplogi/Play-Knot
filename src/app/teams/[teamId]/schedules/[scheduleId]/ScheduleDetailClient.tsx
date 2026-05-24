"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { AttendanceForm } from "@/components/attendance/AttendanceForm";
import { AttendanceList } from "@/components/attendance/AttendanceList";
import { EditScheduleDialog } from "@/components/schedule/EditScheduleDialog";
import { ScheduleGuestsSection } from "@/components/guests/ScheduleGuestsSection";
import type {
  Schedule,
  AttendanceWithUser,
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
};

function SectionHeader({
  title,
  gradient,
  icon,
  right,
}: {
  title: string;
  gradient: string;
  icon: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className={`${gradient} px-5 py-3 flex items-center justify-between`}>
      <p className="text-white text-sm font-bold flex items-center gap-2">
        {icon}
        {title}
      </p>
      {right}
    </div>
  );
}

function DetailRow({
  iconBg,
  iconText,
  icon,
  label,
  children,
}: {
  iconBg: string;
  iconText: string;
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg} ${iconText}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 leading-tight">{label}</p>
        <div className="text-sm font-medium text-gray-900 mt-0.5">{children}</div>
      </div>
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
}: Props) {
  const router = useRouter();

  const memberAttendCount = attendances.filter((a) => a.status === "attend").length;
  const guestAttendCount = invitedGuests.length;
  const attendCount = memberAttendCount + guestAttendCount;

  const myUserId = myAttendance?.user_id ?? null;
  const othersAttendCount =
    attendances.filter((a) => a.status === "attend" && a.user_id !== myUserId).length +
    guestAttendCount;
  const isFull = schedule.capacity !== null && attendCount >= schedule.capacity;

  const responseTotal = totalMembers + invitedGuests.length;
  const attendanceRate =
    responseTotal > 0 ? Math.round((attendCount / responseTotal) * 100) : 0;

  const date = new Date(schedule.date);
  const endDate = schedule.end_date ? new Date(schedule.end_date) : null;

  return (
    <div className="space-y-5">
      {/* ヘッダー: 戻る + 編集 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(`/teams/${teamId}/schedules`)}
          className="text-sm text-gray-600 hover:text-indigo-600 flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          日程一覧に戻る
        </button>
        {canManageSchedule && <EditScheduleDialog schedule={schedule} />}
      </div>

      {/* 日程情報カード */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* グラデヘッダー: 日付ヒーロー */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-500 px-5 py-4 relative overflow-hidden">
          {/* 背景の装飾円 */}
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" aria-hidden="true" />
          <div className="absolute -right-12 -bottom-16 w-32 h-32 rounded-full bg-white/5" aria-hidden="true" />
          <div className="relative">
            <p className="text-indigo-100 text-[11px] font-semibold tracking-widest uppercase">Schedule</p>
            <p className="text-white text-2xl font-bold mt-1 leading-tight">
              {format(date, "M月d日", { locale: ja })}
              <span className="text-indigo-100 text-base font-medium ml-1.5">
                ({format(date, "E", { locale: ja })})
              </span>
            </p>
            <p className="text-indigo-50 text-sm font-medium mt-1.5 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {format(date, "HH:mm")}
              {endDate && <span> 〜 {format(endDate, "HH:mm")}</span>}
            </p>
          </div>
        </div>
        {/* 詳細行 */}
        <div className="p-5 space-y-3">
          <DetailRow
            iconBg="bg-indigo-50"
            iconText="text-indigo-600"
            label="場所"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            }
          >
            {schedule.location}
          </DetailRow>

          {schedule.capacity !== null && (
            <DetailRow
              iconBg="bg-emerald-50"
              iconText="text-emerald-600"
              label="定員"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              }
            >
              <div className="flex items-center gap-2">
                <span>
                  {attendCount} / {schedule.capacity} 人
                </span>
                {isFull ? (
                  <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs">満員</Badge>
                ) : (
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                    残り {schedule.capacity - attendCount} 枠
                  </Badge>
                )}
              </div>
            </DetailRow>
          )}

          {schedule.deadline && (
            <DetailRow
              iconBg="bg-amber-50"
              iconText="text-amber-600"
              label="締切"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            >
              {format(new Date(schedule.deadline), "M月d日(E) HH:mm", { locale: ja })}
            </DetailRow>
          )}

          {schedule.note && (
            <DetailRow
              iconBg="bg-sky-50"
              iconText="text-sky-600"
              label="メモ"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              }
            >
              <p className="whitespace-pre-wrap break-words">{schedule.note}</p>
            </DetailRow>
          )}
        </div>
      </div>

      {/* 出欠回答カード */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader
          title="出欠回答"
          gradient="bg-gradient-to-r from-emerald-600 to-emerald-500"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
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

      {/* ゲスト招集カード */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader
          title="ゲスト招集"
          gradient="bg-gradient-to-r from-amber-500 to-orange-400"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          }
        />
        <div className="p-5">
          <ScheduleGuestsSection
            scheduleId={schedule.id}
            invitedGuests={invitedGuests}
            teamGuests={teamGuests}
            canManage={canManageSchedule}
            onUpdated={() => router.refresh()}
          />
        </div>
      </div>

      {/* 出欠一覧カード */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-sky-600 to-sky-500 px-5 py-3">
          <div className="flex items-center justify-between">
            <p className="text-white text-sm font-bold flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              出欠一覧
            </p>
            <p className="text-white text-xs font-semibold">
              参加 {attendCount} / {responseTotal} 人
            </p>
          </div>
          {/* プログレスバー */}
          <div className="mt-2 h-1.5 bg-sky-800/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${attendanceRate}%` }}
              aria-label={`参加率 ${attendanceRate}%`}
            />
          </div>
        </div>
        <div className="p-5">
          <AttendanceList
            attendances={attendances}
            totalMembers={totalMembers}
            invitedGuests={invitedGuests}
          />
        </div>
      </div>
    </div>
  );
}
