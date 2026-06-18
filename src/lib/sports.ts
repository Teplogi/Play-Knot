/**
 * スポーツ種目の管理
 *
 * teams.sport_type は歴史的に自由入力 (TEXT) で運用してきたため、
 * 値は表示用ラベル (例: "バレーボール") か、本ファイルの SportKey か、
 * あるいはまったく別の文字列 ("テストチーム" 等) のいずれかが入りうる。
 *
 * resolveSport は受け取った文字列から SportKey に解決する。
 * マッチしないものは "volleyball" (依頼チームのデフォルト) にフォールバック。
 */

export type SportKey =
  | "soccer"
  | "basketball"
  | "baseball"
  | "volleyball"
  | "tennis"
  | "softball"
  | "futsal"
  | "handball"
  | "rugby"
  | "american_football"
  | "dodgeball";

export const DEFAULT_SPORT: SportKey = "volleyball";

export type SportOption = {
  key: SportKey;
  label: string;
  /** 別名 — 表記揺れを吸収する用 */
  aliases: string[];
};

export const SPORT_OPTIONS: SportOption[] = [
  { key: "soccer", label: "サッカー", aliases: ["soccer", "football", "フットボール"] },
  { key: "basketball", label: "バスケットボール", aliases: ["basketball", "バスケ"] },
  { key: "baseball", label: "野球", aliases: ["baseball", "ベースボール"] },
  { key: "volleyball", label: "バレーボール", aliases: ["volleyball", "バレー"] },
  { key: "tennis", label: "テニス", aliases: ["tennis", "ソフトテニス", "卓球"] },
  { key: "softball", label: "ソフトボール", aliases: ["softball", "ソフト"] },
  { key: "futsal", label: "フットサル", aliases: ["futsal", "フットサル"] },
  { key: "handball", label: "ハンドボール", aliases: ["handball", "ハンド"] },
  { key: "rugby", label: "ラグビー", aliases: ["rugby", "ラグビー"] },
  { key: "american_football", label: "アメフト", aliases: ["american_football", "americanfootball", "american football", "アメフト", "アメリカンフットボール"] },
  { key: "dodgeball", label: "ドッジボール", aliases: ["dodgeball", "ドッジボール", "ドッヂボール"] },
];

const SPORT_LOOKUP: Record<string, SportKey> = (() => {
  const map: Record<string, SportKey> = {};
  for (const opt of SPORT_OPTIONS) {
    map[opt.key.toLowerCase()] = opt.key;
    map[opt.label.toLowerCase()] = opt.key;
    for (const a of opt.aliases) map[a.toLowerCase()] = opt.key;
  }
  return map;
})();

export function resolveSport(sportType: string | null | undefined): SportKey {
  if (!sportType) return DEFAULT_SPORT;
  return SPORT_LOOKUP[sportType.trim().toLowerCase()] ?? DEFAULT_SPORT;
}

/**
 * 既知のスポーツに厳密に解決する。マッチしなければ null。
 * resolveSport と違いフォールバックしないので、
 * 「その他（自由入力）」かどうかの判定に使える。
 */
export function matchSport(sportType: string | null | undefined): SportKey | null {
  if (!sportType) return null;
  return SPORT_LOOKUP[sportType.trim().toLowerCase()] ?? null;
}

/** スポーツ種別セレクトで「その他（自由入力）」を表す値 */
export const OTHER_SPORT_VALUE = "__other__";

export function getSportLabel(key: SportKey): string {
  return SPORT_OPTIONS.find((o) => o.key === key)?.label ?? "";
}
