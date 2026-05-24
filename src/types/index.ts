// ユーザー（public.usersテーブルに対応）
export type User = {
  id: string;
  name: string;
  email: string;
  gender: "男" | "女" | "未設定";
  birth_year: number | null;
  position: string;
  can_create_team: boolean;
  notification_email: string | null;
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
  end_date: string | null;
  location: string;
  note: string | null;
  capacity: number | null;
  deadline: string | null;
  created_by: string | null;
  created_at: string;
};

// 出欠ステータス
//   - attend: 参加確定
//   - absent: 不参加
//   - tentative: 検討中（allow_tentative ON のチームでのみ新規選択可能。
//                キャパ・チーム分け・統計の母数には含めない）
export type AttendanceStatus = "attend" | "absent" | "tentative";

// 出欠（public.attendancesテーブルに対応）
export type Attendance = {
  id: string;
  schedule_id: string;
  user_id: string;
  status: AttendanceStatus;
  comment: string | null;
  updated_at: string;
  created_at: string;
};

// 助っ人プール（public.team_guests テーブルに対応）
// auth ユーザを持たない、ホスト/共同ホスト管理のチーム単位ゲスト一覧
export type TeamGuest = {
  id: string;
  team_id: string;
  name: string;
  gender: "男" | "女" | "未設定";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

// 日程ごとの招集ゲスト（public.schedule_guests テーブルに対応）
export type ScheduleGuest = {
  id: string;
  schedule_id: string;
  guest_id: string;
  invited_by: string | null;
  created_at: string;
};

export type ScheduleGuestWithGuest = ScheduleGuest & {
  team_guests: TeamGuest;
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

// 必ず同じチームにするペア（public.must_pairs テーブルに対応・ホスト専用）
// chain を作らないため、同一ユーザは最大 1 件のみ参加 (API 層で担保)
export type MustPair = {
  id: string;
  team_id: string;
  user_id_a: string;
  user_id_b: string;
  created_by: string | null;
  created_at: string;
};

// 確定したチーム分け結果（public.saved_team_divisions テーブルに対応）
// 1 日程につき 1 件保存される。teams は Member[][] のスナップショット。
export type SavedTeamDivisionMember = {
  id: string;
  name: string;
  gender: "男" | "女" | "未設定";
  isDummy?: boolean;
};

export type SavedTeamDivision = {
  id: string;
  schedule_id: string;
  team_id: string;
  teams: SavedTeamDivisionMember[][];
  method: "random" | "gender_equal";
  divide_by: "team_count" | "members_per_team";
  divide_value: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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

// 通知日数の選択肢 (0 = 通知しない、1/3/7 = N日前)
export type NotificationDaysBefore = 0 | 1 | 3 | 7;
export const NOTIFICATION_DAYS_OPTIONS: NotificationDaysBefore[] = [0, 1, 3, 7];

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
  cancellation: boolean;
  reminder_days_before: NotificationDaysBefore;
  deadline_days_before: NotificationDaysBefore;
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
  cancellation: true,
  reminder_days_before: 3 as NotificationDaysBefore,
  deadline_days_before: 1 as NotificationDaysBefore,
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
