"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { hasHostPrivilege } from "@/types";
import type { TeamRole } from "@/types";

type TeamNavProps = {
  teamId: string;
  teamName: string;
  role: string;
  iconColor?: string;
  iconUrl?: string | null;
};

const NAV_ICON_BG: Record<string, string> = {
  indigo: "bg-indigo-600",
  emerald: "bg-emerald-600",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  violet: "bg-violet-600",
  cyan: "bg-cyan-600",
};

function getNavItems(teamId: string, role: TeamRole) {
  const isHostOrCoHost = hasHostPrivilege(role);
  return [
    { href: `/teams/${teamId}`, label: "ホーム", icon: "home" },
    { href: `/teams/${teamId}/schedules`, label: "日程", icon: "calendar" },
    { href: `/teams/${teamId}/divide`, label: "チーム分け", icon: "shuffle" },
    ...(isHostOrCoHost
      ? [
          { href: `/teams/${teamId}/members`, label: "メンバー", icon: "users" },
          { href: `/teams/${teamId}/attendance`, label: "出席率", icon: "chart" },
        ]
      : []),
    { href: `/teams/${teamId}/settings`, label: "設定", icon: "settings" },
  ];
}

function NavIcon({ icon, className }: { icon: string; className?: string }) {
  const cn = className || "w-5 h-5";
  switch (icon) {
    case "home":
      return <svg className={cn} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>;
    case "calendar":
      return <svg className={cn} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
    case "shuffle":
      return <svg className={cn} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>;
    case "users":
      return <svg className={cn} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
    case "chart":
      return <svg className={cn} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;
    case "settings":
      return <svg className={cn} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
    default:
      return null;
  }
}

export function TeamNav({ teamId, teamName, role, iconColor = "indigo", iconUrl = null }: TeamNavProps) {
  const pathname = usePathname();
  const { setTeamRole } = useAuth();
  const navItems = getNavItems(teamId, role as TeamRole);
  const navScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTeamRole(role as TeamRole);
  }, [role, setTeamRole]);

  // アクティブなナビアイテムを画面内に自動スクロール
  useEffect(() => {
    const container = navScrollRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>("[data-nav-active='true']");
    if (!active) return;
    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    if (activeRect.left < containerRect.left || activeRect.right > containerRect.right) {
      active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [pathname]);

  const teamHome = `/teams/${teamId}`;
  const isOnTeamHome = pathname === teamHome || pathname === `${teamHome}/`;
  const backHref = isOnTeamHome ? "/teams" : teamHome;
  const backLabel = isOnTeamHome ? "チーム一覧" : "チームホーム";

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      {/* 1段目: チーム情報 + ログアウト */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href={backHref}
            className="text-gray-600 hover:text-gray-900 flex-shrink-0 inline-flex items-center justify-center h-9 w-9 -ml-2 rounded-lg hover:bg-gray-100"
            aria-label={`${backLabel}へ戻る`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </Link>
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={iconUrl}
              alt=""
              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className={`w-8 h-8 rounded-lg ${NAV_ICON_BG[iconColor] ?? NAV_ICON_BG.indigo} flex items-center justify-center flex-shrink-0`}>
              <span className="text-white text-sm font-bold">{teamName.charAt(0)}</span>
            </div>
          )}
          <span className="font-bold text-base text-gray-900 truncate">{teamName}</span>
        </div>
      </div>

      {/* 2段目: ナビメニュー（水平スクロール） */}
      <nav
        ref={navScrollRef}
        aria-label="チームナビゲーション"
        className="overflow-x-auto scrollbar-none border-t border-gray-100"
      >
        <ul className="flex items-stretch gap-1 px-2 sm:px-4 max-w-5xl mx-auto min-w-max">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href} className="flex-shrink-0">
                <Link
                  href={item.href}
                  data-nav-active={isActive}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors duration-150 ${
                    isActive
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300"
                  }`}
                >
                  <NavIcon icon={item.icon} className={`w-5 h-5 ${isActive ? "text-indigo-600" : "text-gray-500"}`} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
