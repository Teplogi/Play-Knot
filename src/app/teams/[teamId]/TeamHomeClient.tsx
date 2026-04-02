"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Schedule, Attendance } from "@/types";

type Props = {
  teamId: string;
  isHost: boolean;
  memberCount: number;
  nextSchedule: (Schedule & { attendances: Attendance[] }) | null;
  myAttendance: Attendance | null;
  attendCount: number;
};

function QuickAction({ href, icon, label, color }: { href: string; icon: React.ReactNode; label: string; color: string }) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-indigo-100 transition-all duration-200 text-center group">
        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
    </Link>
  );
}

export function TeamHomeClient({ teamId, isHost, memberCount, nextSchedule, myAttendance, attendCount }: Props) {
  return (
    <div className="space-y-6">
      {/* 次回練習ヒーローカード */}
      {nextSchedule ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-3">
            <p className="text-indigo-100 text-xs font-medium">次回の練習</p>
          </div>
          <div className="p-5">
            <h2 className="text-lg font-bold text-gray-900">
              {format(new Date(nextSchedule.date), "M月d日(E) HH:mm", { locale: ja })}
            </h2>
            <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
              {nextSchedule.location}
            </p>

            <div className="flex items-center gap-3 mt-4">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                参加 {attendCount}人
              </Badge>
              <span className="text-xs text-gray-400">/ {memberCount}人中</span>
            </div>

            {/* 未回答CTA */}
            {!myAttendance ? (
              <Link href={`/teams/${teamId}/schedules/${nextSchedule.id}`}>
                <Button className="w-full mt-4 h-12 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-base shadow-sm" aria-label="出欠を回答する">
                  出欠を回答する
                </Button>
              </Link>
            ) : (
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">あなたの回答：</span>
                  {myAttendance.status === "attend" ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200">○ 参加</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700 border-red-200">✕ 不参加</Badge>
                  )}
                </div>
                <Link href={`/teams/${teamId}/schedules/${nextSchedule.id}`}>
                  <Button variant="outline" size="sm" aria-label="出欠詳細を見る">詳細</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
          </div>
          <p className="text-gray-500 text-sm">今後の練習予定はありません</p>
        </div>
      )}

      {/* クイックアクション */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">メニュー</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <QuickAction
            href={`/teams/${teamId}/schedules`}
            label="日程一覧"
            color="bg-indigo-50"
            icon={<svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
          />
          <QuickAction
            href={`/teams/${teamId}/divide`}
            label="チーム分け"
            color="bg-emerald-50"
            icon={<svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>}
          />
          {isHost && (
            <>
              <QuickAction
                href={`/teams/${teamId}/members`}
                label="メンバー"
                color="bg-amber-50"
                icon={<svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}
              />
              <QuickAction
                href={`/teams/${teamId}/attendance`}
                label="出席率"
                color="bg-rose-50"
                icon={<svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" /></svg>}
              />
            </>
          )}
        </div>
      </div>

      {/* チーム概要 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">メンバー数</span>
          <span className="font-semibold text-gray-900">{memberCount}人</span>
        </div>
      </div>
    </div>
  );
}
