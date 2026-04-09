export type MemberStats = {
  userId: string;
  name: string;
  attendCount: number;
  absentCount: number;
  attendanceRate: number; // 小数点1桁（例：75.0）
  samedayCancelCount: number; // 当日キャンセル数
};

type MemberInput = {
  user_id: string;
  name: string;
};

type AttendanceInput = {
  user_id: string;
  status: "attend" | "absent";
  created_at: string;
  updated_at: string;
  /** 紐づくスケジュールの日付 */
  schedule_date: string;
};

// 当日キャンセル判定：最終statusがabsent かつ updated_atがスケジュール当日0:00以降
function isSamedayCancel(attendance: AttendanceInput): boolean {
  if (attendance.status !== "absent") return false;
  const scheduleDate = new Date(attendance.schedule_date);
  const scheduleDayStart = new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate());
  const updatedAt = new Date(attendance.updated_at);
  // updated_at がスケジュール当日以降 かつ created_at より後（＝変更があった）
  return updatedAt >= scheduleDayStart && attendance.created_at !== attendance.updated_at;
}

export function calcMemberStats(
  members: MemberInput[],
  attendances: AttendanceInput[]
): MemberStats[] {
  // ユーザーIDごとに出欠をグルーピング
  const attendancesByUser = new Map<string, AttendanceInput[]>();
  for (const a of attendances) {
    const list = attendancesByUser.get(a.user_id) || [];
    list.push(a);
    attendancesByUser.set(a.user_id, list);
  }

  return members.map((member) => {
    const userAttendances = attendancesByUser.get(member.user_id) || [];

    const attendCount = userAttendances.filter((a) => a.status === "attend").length;
    const absentCount = userAttendances.filter((a) => a.status === "absent").length;
    const total = attendCount + absentCount;
    const attendanceRate = total > 0
      ? Math.round((attendCount / total) * 1000) / 10
      : 0;
    const samedayCancelCount = userAttendances.filter(isSamedayCancel).length;

    return {
      userId: member.user_id,
      name: member.name,
      attendCount,
      absentCount,
      attendanceRate,
      samedayCancelCount,
    };
  });
}
