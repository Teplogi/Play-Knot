"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleCard } from "@/components/schedule/ScheduleCard";
import { CreateScheduleDialog } from "@/components/schedule/CreateScheduleDialog";
import type { Schedule, Attendance } from "@/types";

type ScheduleWithAttendances = Schedule & { attendances: Attendance[] };

type Props = {
  teamId: string;
  schedules: ScheduleWithAttendances[];
  totalMembers: number;
  userId: string;
  isHost: boolean;
};

export function ScheduleListClient({ teamId, schedules, totalMembers, userId, isHost }: Props) {
  const [tab, setTab] = useState("upcoming");
  const now = new Date();

  const upcoming = schedules.filter((s) => new Date(s.date) >= now);
  const past = schedules.filter((s) => new Date(s.date) < now).reverse();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">練習日程</h2>
        {isHost && <CreateScheduleDialog teamId={teamId} />}
      </div>

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
    </div>
  );
}
