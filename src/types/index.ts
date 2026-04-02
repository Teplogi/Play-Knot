// ユーザー（public.usersテーブルに対応）
export type User = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

// チーム（public.teamsテーブルに対応）
export type Team = {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
};

// チームメンバー（public.team_membersテーブルに対応）
export type TeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  role: "host" | "guest";
  gender: "男" | "女" | "未設定";
  created_at: string;
};

// 練習日程（public.schedulesテーブルに対応）
export type Schedule = {
  id: string;
  team_id: string;
  date: string;
  location: string;
  note: string | null;
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
