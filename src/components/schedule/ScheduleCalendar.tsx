"use client";

import { useState } from "react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Schedule, Attendance } from "@/types";

type ScheduleWithAttendances = Schedule & { attendances: Attendance[] };

type Props = {
  teamId: string;
  schedules: ScheduleWithAttendances[];
  userId: string;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function ScheduleCalendar({ teamId, schedules, userId }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // 日付 → スケジュール のマップ
  const schedulesByDate = new Map<string, ScheduleWithAttendances[]>();
  for (const s of schedules) {
    const key = format(new Date(s.date), "yyyy-MM-dd");
    const list = schedulesByDate.get(key) || [];
    list.push(s);
    schedulesByDate.set(key, list);
  }

  // カレンダーの全日を生成
  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const today = new Date();

  return (
    <div className="space-y-3">
      {/* 月ナビ */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="text-gray-500 h-8 w-8 p-0"
          aria-label="前月"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </Button>
        <h3 className="font-semibold text-gray-900">
          {format(currentMonth, "yyyy年 M月", { locale: ja })}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="text-gray-500 h-8 w-8 p-0"
          aria-label="翌月"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </Button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`text-xs font-medium py-1.5 ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 border-t border-l border-gray-100">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const daySchedules = schedulesByDate.get(key) || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, today);
          const dayOfWeek = day.getDay();

          return (
            <div
              key={key}
              className={`border-r border-b border-gray-100 min-h-[72px] sm:min-h-[80px] p-1 ${
                !isCurrentMonth ? "bg-gray-50/50" : ""
              }`}
            >
              {/* 日付番号 */}
              <div className="flex justify-center mb-0.5">
                <span
                  className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? "bg-indigo-600 text-white font-bold"
                      : !isCurrentMonth
                      ? "text-gray-300"
                      : dayOfWeek === 0
                      ? "text-red-500"
                      : dayOfWeek === 6
                      ? "text-blue-500"
                      : "text-gray-700"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* スケジュール */}
              <div className="space-y-0.5">
                {daySchedules.map((s) => {
                  const myAtt = s.attendances.find((a) => a.user_id === userId);
                  return (
                    <Link key={s.id} href={`/teams/${teamId}/schedules/${s.id}`}>
                      <div
                        className={`rounded px-1 py-0.5 text-[10px] leading-tight truncate cursor-pointer transition-colors ${
                          myAtt?.status === "attend"
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : myAtt?.status === "absent"
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                        }`}
                        title={`${format(new Date(s.date), "HH:mm")} ${s.location}`}
                      >
                        <span className="font-medium">{format(new Date(s.date), "HH:mm")}</span>
                        <span className="hidden sm:inline"> {s.location}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-4 text-[10px] text-gray-400 justify-center pt-1">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-200" />
          参加
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-50 border border-red-200" />
          不参加
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-50 border border-indigo-200" />
          未回答
        </span>
      </div>
    </div>
  );
}
