// TODO: Supabase接続後に元のServer Component版に戻す
import { ScheduleDetailClient } from "./ScheduleDetailClient";
import type { TeamRole } from "@/types";
import { hasHostPrivilege } from "@/types";

export default async function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ teamId: string; scheduleId: string }>;
}) {
  const { teamId, scheduleId } = await params;

  // UIプレビュー用のモックロール (layout.tsx のモックと揃える)
  const mockRoles: Record<string, TeamRole> = {
    "team-1": "host",
    "team-2": "guest",
    "team-3": "co_host",
  };
  const role: TeamRole = mockRoles[teamId] ?? "host";
  const canManageSchedule = hasHostPrivilege(role);

  const mockSchedule = {
    id: scheduleId,
    team_id: teamId,
    date: new Date(Date.now() + 3 * 86400000).toISOString(),
    location: "市民体育館 Aコート",
    note: "シューズ持参。19時集合。",
    capacity: 5,
    created_by: "mock",
    created_at: "",
  };

  const mockAttendances = [
    { id: "a1", schedule_id: scheduleId, user_id: "u1", status: "attend" as const, comment: null, updated_at: "", created_at: "", users: { id: "u1", name: "田中太郎", email: "tanaka@example.com", gender: "未設定" as const, birth_year: null, position: "", created_at: "" } },
    { id: "a2", schedule_id: scheduleId, user_id: "u2", status: "attend" as const, comment: "少し遅れます", updated_at: "", created_at: "", users: { id: "u2", name: "佐藤花子", email: "sato@example.com", gender: "未設定" as const, birth_year: null, position: "", created_at: "" } },
    { id: "a3", schedule_id: scheduleId, user_id: "u3", status: "absent" as const, comment: "出張のため", updated_at: "", created_at: "", users: { id: "u3", name: "鈴木一郎", email: "suzuki@example.com", gender: "未設定" as const, birth_year: null, position: "", created_at: "" } },
    { id: "a4", schedule_id: scheduleId, user_id: "u4", status: "attend" as const, comment: null, updated_at: "", created_at: "", users: { id: "u4", name: "山田次郎", email: "yamada@example.com", gender: "未設定" as const, birth_year: null, position: "", created_at: "" } },
  ];

  return (
    <ScheduleDetailClient
      schedule={mockSchedule}
      attendances={mockAttendances}
      totalMembers={8}
      myAttendance={null}
      canManageSchedule={canManageSchedule}
      teamId={teamId}
    />
  );
}
