"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Schedule, Attendance } from "@/types";

type UpcomingItem = {
  schedule: Schedule & { attendances: Attendance[] };
  myAttendance: Attendance | null;
  attendCount: number;
};

type Props = {
  teamId: string;
  memberCount: number;
  upcomingItems: UpcomingItem[];
};

const HEADER_LABELS = ["次回の練習", "その次の練習"] as const;
const HEADER_GRADIENTS = [
  "bg-gradient-to-r from-indigo-600 to-indigo-500",
  "bg-gradient-to-r from-sky-600 to-sky-500",
] as const;

function ScheduleCard({
  teamId,
  item,
  memberCount,
  headerLabel,
  headerGradient,
}: {
  teamId: string;
  item: UpcomingItem;
  memberCount: number;
  headerLabel: string;
  headerGradient: string;
}) {
  const { schedule, myAttendance, attendCount } = item;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className={`${headerGradient} px-5 py-2.5`}>
        <p className="text-white text-sm font-semibold tracking-wide">{headerLabel}</p>
      </div>
      <div className="p-5">
        <h2 className="text-xl font-bold text-gray-900">
          {format(new Date(schedule.date), "M月d日(E) HH:mm", { locale: ja })}
        </h2>
        <p className="text-gray-700 text-base mt-1.5 flex items-center gap-1">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
          {schedule.location}
        </p>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300 text-sm py-1 px-2.5">
            参加 {attendCount}人
            {schedule.capacity !== null && <span className="text-gray-600 font-normal ml-0.5">/{schedule.capacity}</span>}
          </Badge>
          <span className="text-sm text-gray-600">/ {memberCount}人中</span>
          {schedule.capacity !== null && attendCount >= schedule.capacity && (
            <Badge className="bg-red-50 text-red-700 border-red-300 text-xs">満員</Badge>
          )}
        </div>

        {!myAttendance ? (
          <Link href={`/teams/${teamId}/schedules/${schedule.id}`}>
            <Button className="w-full mt-4 h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-base shadow-sm" aria-label="出欠を回答する">
              出欠を回答する
            </Button>
          </Link>
        ) : (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">あなたの回答：</span>
              {myAttendance.status === "attend" ? (
                <Badge className="bg-green-100 text-green-800 border-green-300">○ 参加</Badge>
              ) : myAttendance.status === "tentative" ? (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300">？ 検討中</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 border-red-300">✕ 不参加</Badge>
              )}
            </div>
            <Link href={`/teams/${teamId}/schedules/${schedule.id}`}>
              <Button variant="outline" size="sm" aria-label="出欠詳細を見る">詳細</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export function TeamHomeClient({ teamId, memberCount, upcomingItems }: Props) {
  return (
    <div className="space-y-5">
      {upcomingItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
          </div>
          <p className="text-gray-700 text-base">今後の練習予定はありません</p>
        </div>
      ) : (
        upcomingItems.map((item, idx) => (
          <ScheduleCard
            key={item.schedule.id}
            teamId={teamId}
            item={item}
            memberCount={memberCount}
            headerLabel={HEADER_LABELS[idx] ?? "練習"}
            headerGradient={HEADER_GRADIENTS[idx] ?? HEADER_GRADIENTS[0]}
          />
        ))
      )}

      {upcomingItems.length === 1 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center">
          <p className="text-gray-700 text-base">その次の練習はまだ登録されていません</p>
        </div>
      )}
    </div>
  );
}
