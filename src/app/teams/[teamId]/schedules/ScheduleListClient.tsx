"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleCard } from "@/components/schedule/ScheduleCard";
import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";
import { CreateScheduleDialog } from "@/components/schedule/CreateScheduleDialog";
import type { Schedule, Attendance } from "@/types";

type ScheduleWithAttendances = Schedule & { attendances: Attendance[] };

type ViewMode = "list" | "calendar";

const STORAGE_KEY = "playknot-schedule-view";

type Props = {
  teamId: string;
  schedules: ScheduleWithAttendances[];
  totalMembers: number;
  userId: string;
  canManageSchedule: boolean;
  scheduleDefaults?: {
    startTime?: string;
    endTime?: string;
    deadlineHoursBefore?: number;
    locations?: string[];
  };
};

export function ScheduleListClient({ teamId, schedules, totalMembers, userId, canManageSchedule, scheduleDefaults }: Props) {
  const [tab, setTab] = useState("upcoming");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [viewLoaded, setViewLoaded] = useState(false);
  const now = new Date();

  const upcoming = schedules.filter((s) => new Date(s.date) >= now);
  const past = schedules.filter((s) => new Date(s.date) < now).reverse();

  // localStorage からデフォルト表示を復元
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "list" || saved === "calendar") {
        setViewMode(saved);
      }
    } catch { /* noop */ }
    setViewLoaded(true);
  }, []);

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch { /* noop */ }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">練習日程</h2>
        <div className="flex items-center gap-2">
          {/* 表示切替 */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => handleViewChange("list")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              aria-label="リスト表示"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
              リスト
            </button>
            <button
              onClick={() => handleViewChange("calendar")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "calendar"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              aria-label="カレンダー表示"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
              カレンダー
            </button>
          </div>
          {canManageSchedule && <CreateScheduleDialog teamId={teamId} defaults={scheduleDefaults} />}
        </div>
      </div>

      {/* カレンダー表示 */}
      {viewMode === "calendar" && viewLoaded && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4">
          <ScheduleCalendar
            teamId={teamId}
            schedules={schedules}
            userId={userId}
          />
        </div>
      )}

      {/* リスト表示 */}
      {viewMode === "list" && viewLoaded && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="upcoming">
              今後の日程 ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              過去の日程 ({past.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-3 mt-4">
            {upcoming.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                今後の日程はありません
              </p>
            ) : (
              upcoming.map((schedule) => (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  teamId={teamId}
                  totalMembers={totalMembers}
                  userId={userId}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-3 mt-4">
            {past.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                過去の日程はありません
              </p>
            ) : (
              past.map((schedule) => (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  teamId={teamId}
                  totalMembers={totalMembers}
                  userId={userId}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
