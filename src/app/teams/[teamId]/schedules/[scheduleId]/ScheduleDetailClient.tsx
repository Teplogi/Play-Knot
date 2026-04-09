"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AttendanceForm } from "@/components/attendance/AttendanceForm";
import { AttendanceList } from "@/components/attendance/AttendanceList";
import { EditScheduleDialog } from "@/components/schedule/EditScheduleDialog";
import type { Schedule, AttendanceWithUser } from "@/types";

type Props = {
  schedule: Schedule;
  attendances: AttendanceWithUser[];
  totalMembers: number;
  myAttendance: AttendanceWithUser | null;
  canManageSchedule: boolean;
  teamId: string;
};

export function ScheduleDetailClient({
  schedule,
  attendances,
  totalMembers,
  myAttendance,
  canManageSchedule,
  teamId,
}: Props) {
  const router = useRouter();

  const attendCount = attendances.filter((a) => a.status === "attend").length;
  const myUserId = myAttendance?.user_id ?? null;
  const othersAttendCount = attendances.filter((a) => a.status === "attend" && a.user_id !== myUserId).length;
  const isFull = schedule.capacity !== null && attendCount >= schedule.capacity;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(`/teams/${teamId}/schedules`)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 日程一覧に戻る
        </button>
        {canManageSchedule && <EditScheduleDialog schedule={schedule} />}
      </div>

      {/* 日程情報 */}
      <Card>
        <CardHeader>
          <CardTitle>
            {format(new Date(schedule.date), "yyyy年M月d日(E) HH:mm", { locale: ja })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <span className="text-muted-foreground text-sm w-12">場所</span>
            <span className="text-sm">{schedule.location}</span>
          </div>
          {schedule.capacity !== null && (
            <div className="flex gap-2 items-center">
              <span className="text-muted-foreground text-sm w-12">定員</span>
              <span className="text-sm">
                {attendCount} / {schedule.capacity} 人
              </span>
              {isFull ? (
                <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">満員</Badge>
              ) : (
                <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">
                  残り {schedule.capacity - attendCount} 枠
                </Badge>
              )}
            </div>
          )}
          {schedule.note && (
            <div className="flex gap-2">
              <span className="text-muted-foreground text-sm w-12">メモ</span>
              <span className="text-sm">{schedule.note}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 出欠回答フォーム */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">出欠回答</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceForm
            scheduleId={schedule.id}
            currentStatus={myAttendance?.status || null}
            currentComment={myAttendance?.comment || ""}
            onUpdated={() => router.refresh()}
            scheduleDate={schedule.date}
            capacity={schedule.capacity}
            othersAttendCount={othersAttendCount}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* 出欠一覧 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">出欠一覧</h3>
        <AttendanceList attendances={attendances} totalMembers={totalMembers} />
      </div>
    </div>
  );
}
