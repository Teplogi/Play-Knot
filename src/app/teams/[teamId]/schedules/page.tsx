// TODO: Supabase接続後に元のServer Component版に戻す
import { ScheduleListClient } from "./ScheduleListClient";
import type { TeamRole } from "@/types";
import { hasHostPrivilege } from "@/types";

export default async function SchedulesPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  // UIプレビュー用のモックロール (layout.tsx のモックと揃える)
  const mockRoles: Record<string, TeamRole> = {
    "team-1": "host",
    "team-2": "guest",
    "team-3": "co_host",
  };
  const role: TeamRole = mockRoles[teamId] ?? "host";
  const canManageSchedule = hasHostPrivilege(role);

  const now = Date.now();
  const mockSchedules = [
    {
      id: "s1", team_id: teamId, date: new Date(now + 3 * 86400000).toISOString(),
      location: "市民体育館 Aコート", note: null, capacity: 5, created_by: "mock", created_at: "",
      attendances: [
        { id: "a1", schedule_id: "s1", user_id: "u1", status: "attend" as const, comment: null, updated_at: "", created_at: "" },
        { id: "a2", schedule_id: "s1", user_id: "u2", status: "attend" as const, comment: "少し遅れます", updated_at: "", created_at: "" },
        { id: "a3", schedule_id: "s1", user_id: "mock-user-id", status: "attend" as const, comment: null, updated_at: "", created_at: "" },
      ],
    },
    {
      id: "s2", team_id: teamId, date: new Date(now + 10 * 86400000).toISOString(),
      location: "中央公園グラウンド", note: "雨天中止", capacity: 10, created_by: "mock", created_at: "",
      attendances: [
        { id: "a4", schedule_id: "s2", user_id: "u1", status: "attend" as const, comment: null, updated_at: "", created_at: "" },
      ],
    },
    {
      id: "s3", team_id: teamId, date: new Date(now - 5 * 86400000).toISOString(),
      location: "大学体育館", note: null, capacity: null, created_by: "mock", created_at: "",
      attendances: [
        { id: "a5", schedule_id: "s3", user_id: "u1", status: "attend" as const, comment: null, updated_at: "", created_at: "" },
        { id: "a6", schedule_id: "s3", user_id: "u2", status: "absent" as const, comment: null, updated_at: "", created_at: "" },
        { id: "a7", schedule_id: "s3", user_id: "mock-user-id", status: "absent" as const, comment: "体調不良", updated_at: "", created_at: "" },
      ],
    },
  ];

  return (
    <ScheduleListClient
      teamId={teamId}
      schedules={mockSchedules}
      totalMembers={8}
      userId="mock-user-id"
      canManageSchedule={canManageSchedule}
    />
  );
}
