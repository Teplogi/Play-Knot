// ユーザー（public.usersテーブルに対応）
export type User = {
  id: string;
  name: string;
  email: string;
  gender: "男" | "女" | "未設定";
  birth_year: number | null;
  position: string;
  created_at: string;
};

// チーム（public.teamsテーブルに対応）
export type Team = {
  id: string;
  name: string;
  sport_type: string;
  icon_color: string;
  created_by: string | null;
  created_at: string;
};

// ロール型
export type TeamRole = "host" | "co_host" | "guest";

// チームメンバー（public.team_membersテーブルに対応）
export type TeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  gender: "男" | "女" | "未設定";
  created_at: string;
};

// ロール表示名
export const ROLE_LABELS: Record<TeamRole, string> = {
  host: "ホスト",
  co_host: "共同ホスト",
  guest: "ゲスト",
};

// ホスト権限を持つロール（host + co_host）
export function hasHostPrivilege(role: TeamRole | string | null): boolean {
  return role === "host" || role === "co_host";
}

// 練習日程（public.schedulesテーブルに対応）
export type Schedule = {
  id: string;
  team_id: string;
  date: string;
  location: string;
  note: string | null;
  capacity: number | null; // 定員（null の場合は無制限）
  created_by: string | null;
  created_at: string;
};

// 出欠（public.attendancesテーブルに対応）
export type Attendance = {
  id: string;
  schedule_id: string;
  user_id: string;
  status: "attend" | "absent";
  comment: string | null;
  updated_at: string;
  created_at: string;
};

// NGペア（public.ng_pairsテーブルに対応・ホスト専用・ゲストには非表示）
export type NgPair = {
  id: string;
  team_id: string;
  user_id_a: string;
  user_id_b: string;
  created_by: string | null;
  created_at: string;
};

// 招待トークン（public.invite_tokensテーブルに対応）
export type InviteToken = {
  id: string;
  token: string;
  team_id: string;
  created_by: string | null;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
};

// 通知設定（ユーザーごと・public.notification_preferencesテーブルに対応）
export type NotificationPreference = {
  id: string;
  user_id: string;
  team_id: string;
  schedule_created: boolean;
  schedule_changed: boolean;
  reminder: boolean;
  deadline: boolean;
  reopened: boolean;
  updated_at: string;
  created_at: string;
};

// 通知設定のデフォルト値（未保存ユーザー用）
export const DEFAULT_NOTIFICATION_PREFS = {
  schedule_created: true,
  schedule_changed: true,
  reminder: true,
  deadline: true,
  reopened: true,
} as const;

// リレーション付きの結合型
export type TeamMemberWithUser = TeamMember & {
  users: User;
};

export type AttendanceWithUser = Attendance & {
  users: User;
};

export type ScheduleWithAttendances = Schedule & {
  attendances: AttendanceWithUser[];
};
