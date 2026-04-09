"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export type TeamSettings = {
  name: string;
  description: string;
  sportType: string;
  iconColor: string;

  defaultExpirationDays: number;

  defaultLocations: string[];
  defaultStartTime: string;
  defaultEndTime: string;
  attendanceDeadlineHoursBefore: number;

  defaultDivideBy: "team_count" | "members_per_team";
  defaultDivideValue: number;
  defaultDivideMethod: "random" | "gender_equal";
  autoSelectAttendees: boolean;
};

export type InviteLink = {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  expired: boolean;
};

import type { TeamRole } from "@/types";
import { hasHostPrivilege } from "@/types";

type MemberOption = { id: string; name: string; role: TeamRole };

export type NotificationPref = {
  schedule_created: boolean;
  schedule_changed: boolean;
  reminder: boolean;
  deadline: boolean;
  reopened: boolean;
};

export type AccountSettings = {
  displayName: string;
  gender: "男" | "女" | "未設定";
  birthYear: number | null;
  position: string;
  scheduleView: "list" | "calendar";
};

type SettingsClientProps = {
  teamId: string;
  role: TeamRole;
  initialSettings: TeamSettings;
  initialInvites: InviteLink[];
  members: MemberOption[];
  initialNotificationPrefs: NotificationPref;
  initialAccount: AccountSettings;
};

const ICON_COLORS: { key: string; bg: string; label: string }[] = [
  { key: "indigo", bg: "bg-indigo-600", label: "インディゴ" },
  { key: "emerald", bg: "bg-emerald-600", label: "グリーン" },
  { key: "amber", bg: "bg-amber-500", label: "アンバー" },
  { key: "rose", bg: "bg-rose-500", label: "ローズ" },
  { key: "violet", bg: "bg-violet-600", label: "バイオレット" },
  { key: "cyan", bg: "bg-cyan-600", label: "シアン" },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
      <div>
        <h3 className="font-bold text-gray-900">{title}</h3>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer py-1">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors mt-0.5 ${
          checked ? "bg-indigo-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
      </div>
    </label>
  );
}

export function SettingsClient({ teamId, role, initialSettings, initialInvites, members, initialNotificationPrefs, initialAccount }: SettingsClientProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<TeamSettings>(initialSettings);
  const [invites, setInvites] = useState<InviteLink[]>(initialInvites);

  const isHostOrCoHost = hasHostPrivilege(role);
  const isHost = role === "host";

  // アカウント設定（個人）
  const [account, setAccount] = useState<AccountSettings>(initialAccount);
  const [accountSaving, setAccountSaving] = useState(false);

  const updateAccount = <K extends keyof AccountSettings>(key: K, value: AccountSettings[K]) => {
    setAccount((prev) => ({ ...prev, [key]: value }));
  };

  const saveAccount = async () => {
    setAccountSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: account.displayName,
          gender: account.gender,
          birth_year: account.birthYear,
          position: account.position,
        }),
      });
      if (!res.ok) throw new Error();
      try { localStorage.setItem("playknot-schedule-view", account.scheduleView); } catch { /* noop */ }
      toast.success("アカウント情報を保存しました");
    } catch {
      toast.error("アカウント情報の保存に失敗しました");
    } finally {
      setAccountSaving(false);
    }
  };

  // 通知設定（個人）
  const [notifPrefs, setNotifPrefs] = useState<NotificationPref>(initialNotificationPrefs);
  const [notifSaving, setNotifSaving] = useState(false);

  const updateNotif = <K extends keyof NotificationPref>(key: K, value: boolean) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: value }));
  };

  // ダイアログ state
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const update = <K extends keyof TeamSettings>(key: K, value: TeamSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // ---- Section handlers ----
  const [basicSaving, setBasicSaving] = useState(false);
  const saveBasic = async () => {
    setBasicSaving(true);
    try {
      const res = await fetch("/api/teams/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          name: settings.name,
          sportType: settings.sportType,
          description: settings.description,
          iconColor: settings.iconColor,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("基本情報を保存しました");
    } catch {
      toast.error("基本情報の保存に失敗しました");
    } finally {
      setBasicSaving(false);
    }
  };

  const saveNotifications = async () => {
    setNotifSaving(true);
    try {
      const res = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, ...notifPrefs }),
      });
      if (!res.ok) throw new Error();
      toast.success("通知設定を保存しました");
    } catch {
      toast.success("通知設定を保存しました");
    } finally {
      setNotifSaving(false);
    }
  };

  const [schedSaving, setSchedSaving] = useState(false);
  const saveScheduleDefaults = async () => {
    setSchedSaving(true);
    try {
      const res = await fetch("/api/teams/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          default_locations: settings.defaultLocations,
          default_start_time: settings.defaultStartTime,
          default_end_time: settings.defaultEndTime,
          attendance_deadline_hours_before: settings.attendanceDeadlineHoursBefore,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("日程のデフォルト設定を保存しました");
    } catch {
      toast.error("日程のデフォルト設定の保存に失敗しました");
    } finally {
      setSchedSaving(false);
    }
  };

  const [divideSaving, setDivideSaving] = useState(false);
  const saveDivideDefaults = async () => {
    setDivideSaving(true);
    try {
      const res = await fetch("/api/teams/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          default_divide_by: settings.defaultDivideBy,
          default_divide_value: settings.defaultDivideValue,
          default_divide_method: settings.defaultDivideMethod,
          auto_select_attendees: settings.autoSelectAttendees,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("チーム分けのデフォルト設定を保存しました");
    } catch {
      toast.error("チーム分けのデフォルト設定の保存に失敗しました");
    } finally {
      setDivideSaving(false);
    }
  };

  const generateInvite = async () => {
    try {
      const res = await fetch("/api/invite/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, expirationDays: settings.defaultExpirationDays }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const newInvite: InviteLink = {
        id: data.id,
        token: data.token,
        createdAt: data.created_at,
        expiresAt: data.expires_at,
        usedAt: null,
        expired: false,
      };
      setInvites((prev) => [newInvite, ...prev]);
      toast.success("招待リンクを発行しました");
    } catch {
      toast.error("招待リンクの発行に失敗しました");
    }
  };

  const revokeInvite = async (id: string) => {
    try {
      const res = await fetch(`/api/invite/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setInvites((prev) => prev.filter((i) => i.id !== id));
      toast.success("招待リンクを無効化しました");
    } catch {
      toast.error("招待リンクの削除に失敗しました");
    }
  };

  const copyInvite = async (token: string) => {
    const url = `${window.location.origin}/login?token=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("招待URLをコピーしました");
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  const addLocationPreset = (loc: string) => {
    const trimmed = loc.trim();
    if (!trimmed) return;
    if (settings.defaultLocations.includes(trimmed)) {
      toast.error("既に登録されています");
      return;
    }
    update("defaultLocations", [...settings.defaultLocations, trimmed]);
  };

  const removeLocationPreset = (loc: string) => {
    update("defaultLocations", settings.defaultLocations.filter((l) => l !== loc));
  };

  const confirmTransfer = async () => {
    if (!transferTargetId) return;
    const target = members.find((m) => m.id === transferTargetId);
    try {
      const res = await fetch("/api/teams/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, newOwnerId: transferTargetId }),
      });
      if (!res.ok) throw new Error();
      setTransferOpen(false);
      setTransferTargetId(null);
      toast.success(`オーナーを ${target?.name ?? ""} に譲渡しました`);
      router.refresh();
    } catch {
      toast.error("オーナーの譲渡に失敗しました");
    }
  };

  const confirmDelete = async () => {
    if (deleteConfirmText !== settings.name) {
      toast.error("チーム名が一致しません");
      return;
    }
    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDeleteOpen(false);
      setDeleteConfirmText("");
      toast.success("チームを削除しました");
      router.push("/teams");
    } catch {
      toast.error("チームの削除に失敗しました");
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  };

  const guestMembers = members.filter((m) => m.role === "guest");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">設定</h2>

      {/* 0. アカウント設定（全ロール共通・個人） */}
      <Section title="アカウント設定" description="あなたのプロフィール情報を設定します">
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-700">
              この設定はあなた個人のものです。チーム内での表示名や属性を設定できます。
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-name">表示名</Label>
            <Input
              id="account-name"
              value={account.displayName}
              onChange={(e) => updateAccount("displayName", e.target.value)}
              maxLength={30}
              placeholder="チーム内で表示される名前"
            />
          </div>
          <div className="space-y-2">
            <Label>性別</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["男", "女", "未設定"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => updateAccount("gender", g)}
                  className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
                    account.gender === g
                      ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 bg-white text-gray-600"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-birth-year">生まれ年（任意）</Label>
            <div className="flex items-center gap-2">
              <Input
                id="account-birth-year"
                type="number"
                min={1940}
                max={2020}
                value={account.birthYear ?? ""}
                onChange={(e) => updateAccount("birthYear", e.target.value ? parseInt(e.target.value, 10) : null)}
                className="w-32"
                placeholder="例: 1995"
              />
              <span className="text-sm text-gray-500">年</span>
            </div>
            <p className="text-xs text-gray-400">チーム分けの参考に使われることがあります</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-position">ポジション / 役割（任意）</Label>
            <Input
              id="account-position"
              value={account.position}
              onChange={(e) => updateAccount("position", e.target.value)}
              maxLength={30}
              placeholder="例: ポイントガード、GK、セッター"
            />
          </div>
          <div className="space-y-2">
            <Label>日程のデフォルト表示</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateAccount("scheduleView", "list")}
                className={`h-10 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  account.scheduleView === "list"
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 bg-white text-gray-600"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
                リスト
              </button>
              <button
                type="button"
                onClick={() => updateAccount("scheduleView", "calendar")}
                className={`h-10 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  account.scheduleView === "calendar"
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 bg-white text-gray-600"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                カレンダー
              </button>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={saveAccount} disabled={accountSaving} className="rounded-lg bg-indigo-600 hover:bg-indigo-700">
              {accountSaving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </Section>

      {/* 1. 基本情報（ホスト・共同ホストのみ） */}
      {isHostOrCoHost && (
      <Section title="基本情報" description="チーム名・説明・アイコンを変更します">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">チーム名</Label>
            <Input
              id="team-name"
              value={settings.name}
              onChange={(e) => update("name", e.target.value)}
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-sport">スポーツ種別</Label>
            <Input
              id="team-sport"
              value={settings.sportType}
              onChange={(e) => update("sportType", e.target.value)}
              placeholder="例: バスケットボール"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-desc">説明</Label>
            <textarea
              id="team-desc"
              value={settings.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              maxLength={200}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="チームの活動内容などを記入"
            />
            <p className="text-xs text-gray-400 text-right">{settings.description.length}/200</p>
          </div>
          <div className="space-y-2">
            <Label>アイコン色</Label>
            <div className="flex gap-2 flex-wrap">
              {ICON_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => update("iconColor", c.key)}
                  aria-label={c.label}
                  className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center text-white font-bold transition-all ${
                    settings.iconColor === c.key ? "ring-2 ring-offset-2 ring-indigo-500 scale-110" : ""
                  }`}
                >
                  {settings.name.charAt(0)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveBasic} className="rounded-lg bg-indigo-600 hover:bg-indigo-700">保存</Button>
          </div>
        </div>
      </Section>
      )}

      {/* 2. 招待リンク管理（ホスト・共同ホストのみ） */}
      {isHostOrCoHost && (
      <Section title="招待リンク" description="新しいメンバーを招待するリンクを発行・管理します">
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="space-y-2 flex-1">
              <Label htmlFor="expiration">有効期限のデフォルト</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="expiration"
                  type="number"
                  min={1}
                  max={90}
                  value={settings.defaultExpirationDays}
                  onChange={(e) => update("defaultExpirationDays", parseInt(e.target.value, 10) || 1)}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">日間</span>
              </div>
            </div>
            <Button onClick={generateInvite} className="rounded-lg bg-indigo-600 hover:bg-indigo-700">
              + 新しい招待リンクを発行
            </Button>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">発行済みリンク</p>
            {invites.length === 0 ? (
              <p className="text-sm text-gray-400">招待リンクはありません</p>
            ) : (
              <div className="space-y-2">
                {invites.map((inv) => {
                  const expired = inv.expired;
                  const used = inv.usedAt !== null;
                  return (
                    <div
                      key={inv.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-xs text-gray-700 font-mono truncate">...{inv.token.slice(-8)}</code>
                          {used && <Badge variant="secondary" className="text-[10px]">使用済み</Badge>}
                          {expired && !used && <Badge variant="outline" className="text-[10px] text-red-600 border-red-200">期限切れ</Badge>}
                          {!expired && !used && <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">有効</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          発行: {formatDate(inv.createdAt)} / 期限: {formatDate(inv.expiresAt)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {!used && !expired && (
                          <Button variant="outline" size="sm" onClick={() => copyInvite(inv.token)} className="rounded-lg h-8 text-xs">
                            URL コピー
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeInvite(inv.id)}
                          className="rounded-lg h-8 text-xs text-gray-400 hover:text-red-500"
                        >
                          削除
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Section>
      )}

      {/* 4. 通知設定（個人設定・全ロール共通） */}
      <Section title="あなたの通知設定" description="このチームからの通知の受け取り設定です">
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-700">
              この設定はあなた個人のものです。他のメンバーの通知には影響しません。
            </p>
          </div>
          <Toggle
            checked={notifPrefs.schedule_created}
            onChange={(v) => updateNotif("schedule_created", v)}
            label="日程追加"
            description="新しい日程が追加されたときに通知を受け取る"
          />
          <Toggle
            checked={notifPrefs.schedule_changed}
            onChange={(v) => updateNotif("schedule_changed", v)}
            label="日程変更・削除"
            description="日程の変更やキャンセルがあったときに通知を受け取る"
          />
          <Toggle
            checked={notifPrefs.reminder}
            onChange={(v) => updateNotif("reminder", v)}
            label="未回答リマインド"
            description="出欠が未回答の場合にリマインド通知を受け取る"
          />
          <Toggle
            checked={notifPrefs.deadline}
            onChange={(v) => updateNotif("deadline", v)}
            label="締め切り通知"
            description="出欠回答の締め切りが近づいたときに通知を受け取る"
          />
          <Toggle
            checked={notifPrefs.reopened}
            onChange={(v) => updateNotif("reopened", v)}
            label="再募集通知"
            description="キャンセルが出て空きができたときに通知を受け取る"
          />
          <div className="flex justify-end pt-2">
            <Button onClick={saveNotifications} disabled={notifSaving} className="rounded-lg bg-indigo-600 hover:bg-indigo-700">
              {notifSaving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </Section>

      {/* 5. 日程のデフォルト（ホスト・共同ホストのみ） */}
      {isHostOrCoHost && (
      <Section title="日程のデフォルト" description="日程作成時に自動入力される値を設定します">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>よく使う場所</Label>
            <div className="space-y-2">
              {settings.defaultLocations.map((loc) => (
                <div key={loc} className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 bg-gray-50/50">
                  <span className="text-sm text-gray-700 flex-1">{loc}</span>
                  <button
                    type="button"
                    onClick={() => removeLocationPreset(loc)}
                    className="text-gray-400 hover:text-red-500 text-xs px-2"
                    aria-label={`${loc}を削除`}
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
            <LocationAdder onAdd={addLocationPreset} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default-start">デフォルト開始時刻</Label>
              <Input
                id="default-start"
                type="time"
                value={settings.defaultStartTime}
                onChange={(e) => update("defaultStartTime", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-end">デフォルト終了時刻</Label>
              <Input
                id="default-end"
                type="time"
                value={settings.defaultEndTime}
                onChange={(e) => update("defaultEndTime", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">出欠回答の締切</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">開催</span>
              <Input
                id="deadline"
                type="number"
                min={0}
                max={72}
                value={settings.attendanceDeadlineHoursBefore}
                onChange={(e) => update("attendanceDeadlineHoursBefore", parseInt(e.target.value, 10) || 0)}
                className="w-20"
              />
              <span className="text-sm text-gray-500">時間前に締め切る（0 で開始時刻）</span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveScheduleDefaults} disabled={schedSaving} className="rounded-lg bg-indigo-600 hover:bg-indigo-700">{schedSaving ? "保存中..." : "保存"}</Button>
          </div>
        </div>
      </Section>
      )}

      {/* 6. チーム分けのデフォルト（ホスト・共同ホストのみ） */}
      {isHostOrCoHost && (
      <Section title="チーム分けのデフォルト" description="チーム分け画面で最初に表示される値を設定します">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>分け方</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => update("defaultDivideBy", "team_count")}
                className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
                  settings.defaultDivideBy === "team_count"
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 bg-white text-gray-600"
                }`}
              >
                チーム数を指定
              </button>
              <button
                type="button"
                onClick={() => update("defaultDivideBy", "members_per_team")}
                className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
                  settings.defaultDivideBy === "members_per_team"
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 bg-white text-gray-600"
                }`}
              >
                1チームの人数を指定
              </button>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Input
                type="number"
                min={1}
                max={20}
                value={settings.defaultDivideValue}
                onChange={(e) => update("defaultDivideValue", parseInt(e.target.value, 10) || 2)}
                className="w-24"
              />
              <span className="text-sm text-gray-500">
                {settings.defaultDivideBy === "team_count" ? "チーム" : "人/チーム"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>振り分け方式</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => update("defaultDivideMethod", "random")}
                className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
                  settings.defaultDivideMethod === "random"
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 bg-white text-gray-600"
                }`}
              >
                ランダム
              </button>
              <button
                type="button"
                onClick={() => update("defaultDivideMethod", "gender_equal")}
                className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
                  settings.defaultDivideMethod === "gender_equal"
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 bg-white text-gray-600"
                }`}
              >
                男女均等
              </button>
            </div>
          </div>

          <Toggle
            checked={settings.autoSelectAttendees}
            onChange={(v) => update("autoSelectAttendees", v)}
            label="参加予定者を自動選択"
            description="チーム分け画面を開いたとき、次回練習の出席者を自動でチェック"
          />

          <div className="flex justify-end">
            <Button onClick={saveDivideDefaults} disabled={divideSaving} className="rounded-lg bg-indigo-600 hover:bg-indigo-700">{divideSaving ? "保存中..." : "保存"}</Button>
          </div>
        </div>
      </Section>
      )}

      {/* 3. Danger zone（ホストのみ） */}
      {isHost && (
      <Section title="危険な操作" description="これらの操作は元に戻せません">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-lg border border-orange-200 bg-orange-50/50">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">オーナーを譲渡</p>
              <p className="text-xs text-gray-500 mt-0.5">別のメンバーにホスト権限を引き継ぎます</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setTransferOpen(true)}
              className="rounded-lg border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              譲渡
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 bg-red-50/50">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">チームを削除</p>
              <p className="text-xs text-gray-500 mt-0.5">チーム・メンバー・日程・出欠・NGリストが全て削除されます</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              className="rounded-lg border-red-300 text-red-700 hover:bg-red-100"
            >
              削除
            </Button>
          </div>
        </div>
      </Section>
      )}

      {/* オーナー譲渡ダイアログ（ホストのみ表示されるが念のためレンダリング） */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>オーナーを譲渡</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-500">
              新しいオーナーを選択してください。譲渡後、あなたはゲストメンバーになります。
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {guestMembers.length === 0 ? (
                <p className="text-sm text-gray-400">譲渡可能なメンバーがいません</p>
              ) : (
                guestMembers.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTransferTargetId(m.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      transferTargetId === m.id
                        ? "border-indigo-400 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                      {m.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{m.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)} className="rounded-lg">キャンセル</Button>
            <Button
              onClick={confirmTransfer}
              disabled={!transferTargetId}
              className="rounded-lg bg-orange-600 hover:bg-orange-700"
            >
              譲渡する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* チーム削除ダイアログ */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteConfirmText("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">チームを削除</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-700">
              この操作は<strong>元に戻せません</strong>。チーム「{settings.name}」に関連するすべてのデータが削除されます。
            </p>
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                確認のため、チーム名 <strong>{settings.name}</strong> を入力してください
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={settings.name}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="rounded-lg">キャンセル</Button>
            <Button
              onClick={confirmDelete}
              disabled={deleteConfirmText !== settings.name}
              className="rounded-lg bg-red-600 hover:bg-red-700"
            >
              完全に削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* teamId は router 経由で使用するだけのメタ情報として保持 */}
      <input type="hidden" value={teamId} readOnly />
    </div>
  );
}

function LocationAdder({ onAdd }: { onAdd: (loc: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="新しい場所を追加"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd(value);
            setValue("");
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          onAdd(value);
          setValue("");
        }}
        className="rounded-lg"
      >
        追加
      </Button>
    </div>
  );
}
