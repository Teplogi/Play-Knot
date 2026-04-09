// TODO: Supabase接続後にサーバー側から TeamSettings を取得して渡す
import { SettingsClient, type TeamSettings, type InviteLink, type NotificationPref, type AccountSettings } from "./SettingsClient";
import type { TeamRole } from "@/types";

const mockMembers: { id: string; name: string; role: TeamRole }[] = [
  { id: "u1", name: "田中太郎", role: "host" },
  { id: "u2", name: "佐藤花子", role: "co_host" },
  { id: "u3", name: "鈴木一郎", role: "guest" },
  { id: "u4", name: "山田次郎", role: "guest" },
  { id: "u5", name: "高橋美咲", role: "guest" },
  { id: "u6", name: "伊藤健太", role: "guest" },
];

export default async function SettingsPage({
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

  // モック用の固定日時（本番では DB から取得し、expired は DB の expires_at から計算）
  const mockInvites: InviteLink[] = [
    {
      id: "inv-1",
      token: "abc123def456",
      createdAt: "2026-04-04T00:00:00Z",
      expiresAt: "2026-04-11T00:00:00Z",
      usedAt: null,
      expired: false,
    },
    {
      id: "inv-2",
      token: "xyz789uvw012",
      createdAt: "2026-03-27T00:00:00Z",
      expiresAt: "2026-04-03T00:00:00Z",
      usedAt: "2026-04-02T00:00:00Z",
      expired: true,
    },
  ];

  const mockSettings: TeamSettings = {
    name: teamId === "team-2" ? "フットサルサークル" : "バスケットボール部",
    description: "毎週水曜と土曜に活動しています。初心者歓迎！",
    sportType: teamId === "team-2" ? "フットサル" : "バスケットボール",
    iconColor: "indigo",

    defaultExpirationDays: 7,

    defaultLocations: ["市民体育館 Aコート", "○○小学校 体育館"],
    defaultStartTime: "19:00",
    defaultDurationMinutes: 120,
    attendanceDeadlineHoursBefore: 1,

    defaultDivideBy: "team_count",
    defaultDivideValue: 2,
    defaultDivideMethod: "random",
    autoSelectAttendees: true,
  };

  const mockAccount: AccountSettings = {
    displayName: "テストユーザー",
    gender: "未設定",
    birthYear: 1995,
    position: "",
    scheduleView: "list",
  };

  const mockNotificationPrefs: NotificationPref = {
    schedule_created: true,
    schedule_changed: true,
    reminder: true,
    deadline: true,
    reopened: true,
  };

  return (
    <SettingsClient
      teamId={teamId}
      role={role}
      initialSettings={mockSettings}
      initialInvites={mockInvites}
      members={mockMembers}
      initialNotificationPrefs={mockNotificationPrefs}
      initialAccount={mockAccount}
    />
  );
}
