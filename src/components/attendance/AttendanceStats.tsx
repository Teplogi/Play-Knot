"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { MemberStats } from "@/lib/attendance/stats";

type SortKey = "name" | "attendanceRate" | "cancelCount";
type SortDir = "asc" | "desc";

type AttendanceStatsProps = {
  stats: MemberStats[];
};

function RateBar({ rate }: { rate: number }) {
  const color = rate >= 75 ? "bg-green-500" : rate >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="progress-bar w-full">
      <div className={`progress-bar-fill ${color}`} style={{ width: `${Math.min(rate, 100)}%` }} />
    </div>
  );
}

function RateBadge({ rate }: { rate: number }) {
  if (rate >= 75) return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs font-semibold">{rate.toFixed(1)}%</Badge>;
  if (rate >= 50) return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs font-semibold">{rate.toFixed(1)}%</Badge>;
  return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs font-semibold">{rate.toFixed(1)}%</Badge>;
}

export function AttendanceStats({ stats }: AttendanceStatsProps) {
  const [sortKey, setSortKey] = useState<SortKey>("attendanceRate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const sorted = [...stats].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") cmp = a.name.localeCompare(b.name, "ja");
    else if (sortKey === "attendanceRate") cmp = a.attendanceRate - b.attendanceRate;
    else cmp = a.cancelCount - b.cancelCount;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const arrow = (key: SortKey) => sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="space-y-2">
      {/* ソートヘッダー */}
      <div className="flex gap-2 text-xs">
        <button onClick={() => handleSort("name")} className={`px-2 py-1 rounded-lg transition-colors ${sortKey === "name" ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-400 hover:text-gray-600"}`}>
          名前{arrow("name")}
        </button>
        <button onClick={() => handleSort("attendanceRate")} className={`px-2 py-1 rounded-lg transition-colors ${sortKey === "attendanceRate" ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-400 hover:text-gray-600"}`}>
          出席率{arrow("attendanceRate")}
        </button>
        <button onClick={() => handleSort("cancelCount")} className={`px-2 py-1 rounded-lg transition-colors ${sortKey === "cancelCount" ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-400 hover:text-gray-600"}`}>
          ドタキャン{arrow("cancelCount")}
        </button>
      </div>

      {/* メンバーカード */}
      {sorted.length === 0 ? (
        <p className="text-center text-gray-400 py-12 text-sm">データがありません</p>
      ) : (
        sorted.map((s) => (
          <div key={s.userId} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                  {s.name.charAt(0)}
                </div>
                <span className="font-medium text-gray-900 text-sm">{s.name}</span>
                {s.cancelCount >= 3 && (
                  <span className="text-orange-500 text-sm" title="ドタキャン3回以上" role="img" aria-label="警告">⚠</span>
                )}
              </div>
              <RateBadge rate={s.attendanceRate} />
            </div>
            <RateBar rate={s.attendanceRate} />
            <div className="flex gap-4 mt-2 text-xs text-gray-400">
              <span>出席 <span className="text-green-600 font-medium">{s.attendCount}</span></span>
              <span>欠席 <span className="text-red-500 font-medium">{s.absentCount}</span></span>
              <span>ドタキャン <span className={`font-medium ${s.cancelCount >= 3 ? "text-orange-500" : "text-gray-500"}`}>{s.cancelCount}</span></span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
