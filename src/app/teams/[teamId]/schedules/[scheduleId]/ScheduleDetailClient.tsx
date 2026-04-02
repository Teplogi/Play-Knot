"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AttendanceForm } from "@/components/attendance/AttendanceForm";
import { AttendanceList } from "@/components/attendance/AttendanceList";
import { EditScheduleDialog } from "@/components/schedule/EditScheduleDialog";
import type { Schedule, AttendanceWithUser } from "@/types";

type Props = {
  schedule: Schedule;
  attendances: AttendanceWithUser[];
  totalMembers: number;
  myAttendance: AttendanceWithUser | null;
  isHost: boolean;
  teamId: string;
};

export function ScheduleDetailClient({
  schedule,
  attendances,
  totalMembers,
  myAttendance,
  isHost,
  teamId,
}: Props) {
  const router = useRouter();

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
        {isHost && <EditScheduleDialog schedule={schedule} />}
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
