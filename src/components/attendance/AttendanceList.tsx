"use client";

import { Badge } from "@/components/ui/badge";
import type { AttendanceWithUser, ScheduleGuestWithGuest } from "@/types";

type AttendanceListProps = {
  attendances: AttendanceWithUser[];
  /** 母数（チームメンバー総数）。未回答数の表示に使う。 */
  totalMembers: number;
  /** 招集中のゲスト。出欠リストでは「参加」枠に "ゲスト" バッジ付きで表示。 */
  invitedGuests?: ScheduleGuestWithGuest[];
};

// イニシャルアバター
function InitialAvatar({ name, status }: { name: string; status: string }) {
  const bgColor =
    status === "attend"
      ? "bg-green-100 text-green-700"
      : status === "tentative"
      ? "bg-amber-100 text-amber-700"
      : status === "guest"
      ? "bg-amber-100 text-amber-700"
      : "bg-red-100 text-red-700";
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${bgColor}`}
    >
      {name.charAt(0)}
    </div>
  );
}

export function AttendanceList({
  attendances,
  totalMembers,
  invitedGuests = [],
}: AttendanceListProps) {
  const memberAttendCount = attendances.filter((a) => a.status === "attend").length;
  const guestAttendCount = invitedGuests.length;
  const attendCount = memberAttendCount + guestAttendCount;
  const absentCount = attendances.filter((a) => a.status === "absent").length;
  const tentativeCount = attendances.filter((a) => a.status === "tentative").length;
  const unanswered = totalMembers - attendances.length;

  const attending = attendances.filter((a) => a.status === "attend");
  const absent = attendances.filter((a) => a.status === "absent");
  const tentative = attendances.filter((a) => a.status === "tentative");

  return (
    <div className="space-y-4">
      {/* サマリー */}
      <div className="flex gap-2 flex-wrap">
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200 font-medium"
        >
          参加 {attendCount}人
          {guestAttendCount > 0 && (
            <span className="ml-1 text-[10px] text-amber-700">(ゲスト{guestAttendCount})</span>
          )}
        </Badge>
        {tentativeCount > 0 && (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 font-medium"
          >
            検討中 {tentativeCount}人
          </Badge>
        )}
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200 font-medium"
        >
          不参加 {absentCount}人
        </Badge>
        <Badge variant="outline" className="text-gray-500 font-medium">
          未回答 {unanswered}人
        </Badge>
      </div>

      {/* 参加者リスト */}
      {(attending.length > 0 || invitedGuests.length > 0) && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            参加
          </h4>
          <div className="space-y-1.5">
            {attending.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 bg-green-50/50 rounded-lg px-3 py-2"
              >
                <InitialAvatar name={a.users.name} status="attend" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.users.name}</p>
                  {a.comment && (
                    <p className="text-xs text-gray-500 truncate">{a.comment}</p>
                  )}
                </div>
              </div>
            ))}
            {invitedGuests.map((row) => {
              const g = row.team_guests;
              return (
                <div
                  key={row.id}
                  className="flex items-center gap-3 bg-amber-50/40 rounded-lg px-3 py-2"
                >
                  <InitialAvatar name={g.name} status="guest" />
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-900 truncate">{g.name}</p>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200"
                    >
                      ゲスト
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 検討中リスト */}
      {tentative.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            検討中
          </h4>
          <div className="space-y-1.5">
            {tentative.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 bg-amber-50/40 rounded-lg px-3 py-2"
              >
                <InitialAvatar name={a.users.name} status="tentative" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.users.name}</p>
                  {a.comment && (
                    <p className="text-xs text-gray-500 truncate">{a.comment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 不参加リスト */}
      {absent.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            不参加
          </h4>
          <div className="space-y-1.5">
            {absent.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 bg-red-50/30 rounded-lg px-3 py-2"
              >
                <InitialAvatar name={a.users.name} status="absent" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.users.name}</p>
                  {a.comment && (
                    <p className="text-xs text-gray-500 truncate">{a.comment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {attendances.length === 0 && invitedGuests.length === 0 && (
        <p className="text-center text-gray-400 py-8 text-sm">まだ回答がありません</p>
      )}
    </div>
  );
}
