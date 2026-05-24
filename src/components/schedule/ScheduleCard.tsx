"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import type { Schedule, Attendance } from "@/types";

type ScheduleCardProps = {
  schedule: Schedule & { attendances: Attendance[] };
  teamId: string;
  totalMembers: number;
  userId: string;
};

export function ScheduleCard({ schedule, teamId, totalMembers, userId }: ScheduleCardProps) {
  const attendCount = schedule.attendances.filter((a) => a.status === "attend").length;
  const absentCount = schedule.attendances.filter((a) => a.status === "absent").length;
  const tentativeCount = schedule.attendances.filter((a) => a.status === "tentative").length;
  const unanswered = totalMembers - schedule.attendances.length;
  const myAttendance = schedule.attendances.find((a) => a.user_id === userId);
  const hasCapacity = schedule.capacity !== null && schedule.capacity !== undefined;
  // 定員は「参加確定」のみでカウント（検討中は含めない）
  const isFull = hasCapacity && attendCount >= (schedule.capacity as number);

  return (
    <Link href={`/teams/${teamId}/schedules/${schedule.id}`}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md hover:border-indigo-200 transition-all duration-200 cursor-pointer group">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3 min-w-0">
            {/* 日付アイコン */}
            <div className="flex-shrink-0 w-14 h-14 bg-indigo-50 rounded-xl flex flex-col items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <span className="text-xs text-indigo-700 font-semibold leading-none">
                {format(new Date(schedule.date), "M月", { locale: ja })}
              </span>
              <span className="text-xl font-bold text-indigo-700 leading-none mt-0.5">
                {format(new Date(schedule.date), "d")}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-base text-gray-900">
                {format(new Date(schedule.date), "E曜 HH:mm", { locale: ja })}
              </p>
              <p className="text-sm text-gray-700 truncate flex items-center gap-1 mt-1">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                {schedule.location}
              </p>
            </div>
          </div>
          {/* 自分の回答状態 */}
          <div className="flex-shrink-0">
            {myAttendance ? (
              myAttendance.status === "attend" ? (
                <Badge className="bg-green-50 text-green-700 border-green-200 text-sm">○ 参加</Badge>
              ) : myAttendance.status === "tentative" ? (
                <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-sm">？ 検討中</Badge>
              ) : (
                <Badge className="bg-red-50 text-red-700 border-red-200 text-sm">✕ 不参加</Badge>
              )
            ) : (
              <Badge variant="outline" className="text-gray-700 border-gray-300 text-sm">未回答</Badge>
            )}
          </div>
        </div>
        {/* 出欠サマリー */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-gray-100 text-sm items-center">
          <span className="text-green-700 font-semibold">
            参加 {attendCount}
            {hasCapacity && <span className="text-gray-600 font-normal">/{schedule.capacity}</span>}
          </span>
          {tentativeCount > 0 && (
            <span className="text-amber-700 font-semibold">検討中 {tentativeCount}</span>
          )}
          <span className="text-red-600 font-semibold">不参加 {absentCount}</span>
          <span className="text-gray-600">未回答 {unanswered}</span>
          {isFull && (
            <Badge className="bg-red-50 text-red-700 border-red-200 text-xs ml-auto">満員</Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
