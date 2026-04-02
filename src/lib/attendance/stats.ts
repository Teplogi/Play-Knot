export type MemberStats = {
  userId: string;
  name: string;
  attendCount: number;
  absentCount: number;
  attendanceRate: number; // 小数点1桁（例：75.0）
  cancelCount: number;    // ドタキャン数
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
};

// ドタキャン判定：最終statusがabsent かつ created_atとupdated_atの日付が異なる
function isDotacan(attendance: AttendanceInput): boolean {
  if (attendance.status !== "absent") return false;
  const createdDate = new Date(attendance.created_at).toDateString();
  const updatedDate = new Date(attendance.updated_at).toDateString();
  return createdDate !== updatedDate;
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
    const cancelCount = userAttendances.filter(isDotacan).length;

    return {
      userId: member.user_id,
      name: member.name,
      attendCount,
      absentCount,
      attendanceRate,
      cancelCount,
    };
  });
}
