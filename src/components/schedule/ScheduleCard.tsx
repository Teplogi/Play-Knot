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
  const unanswered = totalMembers - schedule.attendances.length;
  const myAttendance = schedule.attendances.find((a) => a.user_id === userId);

  return (
    <Link href={`/teams/${teamId}/schedules/${schedule.id}`}>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-indigo-100 transition-all duration-200 cursor-pointer group">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3 min-w-0">
            {/* 日付アイコン */}
            <div className="flex-shrink-0 w-12 h-12 bg-indigo-50 rounded-xl flex flex-col items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <span className="text-xs text-indigo-500 font-medium leading-none">
                {format(new Date(schedule.date), "M月", { locale: ja })}
              </span>
              <span className="text-lg font-bold text-indigo-700 leading-none">
                {format(new Date(schedule.date), "d")}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">
                {format(new Date(schedule.date), "E曜 HH:mm", { locale: ja })}
              </p>
              <p className="text-sm text-gray-500 truncate flex items-center gap-1 mt-0.5">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                {schedule.location}
              </p>
            </div>
          </div>
          {/* 自分の回答状態 */}
          <div className="flex-shrink-0">
            {myAttendance ? (
              myAttendance.status === "attend" ? (
                <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">○ 参加</Badge>
              ) : (
                <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">✕ 不参加</Badge>
              )
            ) : (
              <Badge variant="outline" className="text-gray-400 border-gray-200 text-xs">未回答</Badge>
            )}
          </div>
        </div>
        {/* 出欠サマリー */}
        <div className="flex gap-4 mt-3 pt-3 border-t border-gray-50 text-xs">
          <span className="text-green-600 font-medium">参加 {attendCount}</span>
          <span className="text-red-500 font-medium">不参加 {absentCount}</span>
          <span className="text-gray-400">未回答 {unanswered}</span>
        </div>
      </div>
    </Link>
  );
}
