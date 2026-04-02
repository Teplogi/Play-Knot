"use client";

import { AttendanceStats } from "@/components/attendance/AttendanceStats";
import type { MemberStats } from "@/lib/attendance/stats";

type Props = {
  stats: MemberStats[];
};

export function AttendanceStatsClient({ stats }: Props) {
  const totalMembers = stats.length;
  const avgRate = totalMembers > 0
    ? (stats.reduce((sum, s) => sum + s.attendanceRate, 0) / totalMembers).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">出席率</h2>
        <p className="text-sm text-muted-foreground">
          {totalMembers}人のメンバー ・ 平均出席率 {avgRate}%
        </p>
      </div>

      <AttendanceStats stats={stats} />
    </div>
  );
}
