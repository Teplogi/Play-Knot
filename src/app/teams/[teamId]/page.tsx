// TODO: Supabase接続後に元のServer Component版に戻す
import { TeamHomeClient } from "./TeamHomeClient";

export default async function TeamHomePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  const mockSchedule = {
    id: "schedule-1",
    team_id: teamId,
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    location: "市民体育館 Aコート",
    note: "シューズ持参",
    capacity: 5,
    created_by: "mock-user-id",
    created_at: "2024-01-01",
    attendances: [
      { id: "a1", schedule_id: "schedule-1", user_id: "user-1", status: "attend" as const, comment: null, updated_at: "", created_at: "" },
      { id: "a2", schedule_id: "schedule-1", user_id: "user-2", status: "attend" as const, comment: null, updated_at: "", created_at: "" },
      { id: "a3", schedule_id: "schedule-1", user_id: "user-3", status: "absent" as const, comment: null, updated_at: "", created_at: "" },
    ],
  };

  // layout.tsx の mockTeams と揃える（本番では team_members テーブルから取得）
  const mockRoles: Record<string, "host" | "guest"> = {
    "team-1": "host",
    "team-2": "guest",
  };
  const isHost = (mockRoles[teamId] ?? "host") === "host";

  return (
    <TeamHomeClient
      teamId={teamId}
      isHost={isHost}
      memberCount={8}
      nextSchedule={mockSchedule}
      myAttendance={null}
      attendCount={2}
    />
  );
}
