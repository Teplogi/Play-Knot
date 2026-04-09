// TODO: Supabase接続後に元のServer Component版に戻す
import { AttendanceStatsClient } from "./AttendanceStatsClient";
import type { MemberStats } from "@/lib/attendance/stats";

export default async function AttendancePage() {
  const mockStats: MemberStats[] = [
    { userId: "u1", name: "田中太郎", attendCount: 12, absentCount: 2, attendanceRate: 85.7, samedayCancelCount: 0 },
    { userId: "u2", name: "佐藤花子", attendCount: 10, absentCount: 4, attendanceRate: 71.4, samedayCancelCount: 1 },
    { userId: "u3", name: "鈴木一郎", attendCount: 8, absentCount: 6, attendanceRate: 57.1, samedayCancelCount: 3 },
    { userId: "u4", name: "山田次郎", attendCount: 13, absentCount: 1, attendanceRate: 92.9, samedayCancelCount: 0 },
    { userId: "u5", name: "高橋美咲", attendCount: 5, absentCount: 9, attendanceRate: 35.7, samedayCancelCount: 4 },
    { userId: "u6", name: "中村大輔", attendCount: 11, absentCount: 3, attendanceRate: 78.6, samedayCancelCount: 1 },
  ];

  return <AttendanceStatsClient stats={mockStats} />;
}
