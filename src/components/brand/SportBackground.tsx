/**
 * スポーツ種目別の背景画像
 *
 * public/sports/ に配置した種目別の背景画像を、全画面の最背面に固定表示する。
 * pointer-events: none / -z-10 でコンテンツ操作には干渉しない。
 *
 * 似た種目は同じ画像を共有する:
 *   - サッカー = フットサル
 *   - 野球 = ソフトボール
 *   - ラグビー = アメフト
 * 専用画像が未提供の種目 (ハンドボール / ドッジボール) は
 * 暫定でデフォルト (バレーボール) の背景を流用している。差し替え予定。
 */

import type { SportKey } from "@/lib/sports";

const FALLBACK_BG = "/sports/volleyball.jpg";

const BG_BY_SPORT: Record<SportKey, string> = {
  soccer: "/sports/soccer.jpg",
  futsal: "/sports/soccer.jpg", // サッカーと共有
  basketball: "/sports/basketball.jpg",
  baseball: "/sports/baseball.jpg",
  softball: "/sports/baseball.jpg", // 野球と共有
  volleyball: "/sports/volleyball.jpg",
  tennis: "/sports/tennis.jpg",
  rugby: "/sports/rugby.jpg",
  american_football: "/sports/rugby.jpg", // ラグビーと共有
  // 専用画像が未提供のため暫定でデフォルトを流用
  handball: FALLBACK_BG,
  dodgeball: FALLBACK_BG,
};

export function SportBackground({ sport }: { sport: SportKey }) {
  const src = BG_BY_SPORT[sport] ?? FALLBACK_BG;
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${src})` }}
      aria-hidden="true"
    />
  );
}
