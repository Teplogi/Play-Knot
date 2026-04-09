// TODO: Supabase接続後に元のServer Component版に戻す
import { TeamsClient } from "./TeamsClient";

export default function TeamsPage() {
  const mockTeams = [
    {
      id: "team-1",
      name: "バスケットボール部",
      sportType: "バスケットボール",
      iconColor: "indigo",
      memberCount: 12,
      nextSchedule: "4/12（土）19:00",
      created_at: "2024-01-15",
      role: "host",
    },
    {
      id: "team-2",
      name: "フットサルサークル",
      sportType: "フットサル",
      iconColor: "emerald",
      memberCount: 8,
      nextSchedule: null,
      created_at: "2024-03-01",
      role: "guest",
    },
    {
      id: "team-3",
      name: "テニスクラブ",
      sportType: "テニス",
      iconColor: "amber",
      memberCount: 6,
      nextSchedule: "4/15（火）18:00",
      created_at: "2024-06-10",
      role: "co_host",
    },
  ];

  return <TeamsClient userName="テストユーザー" teams={mockTeams} />;
}
