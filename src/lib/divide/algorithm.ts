export type Member = {
  id: string;
  name: string;
  gender: "男" | "女" | "未設定";
  isDummy?: boolean;
};

export type NgPair = {
  user_id_a: string;
  user_id_b: string;
};

// 必ず同じチームになるペア。アルゴリズム内では NgPair と同じ形で扱う。
// chain は API 層で禁止しているため、各メンバーは最大 1 件のみ含まれる前提。
export type MustPair = {
  user_id_a: string;
  user_id_b: string;
};

export type DivideResult = {
  teams: Member[][];
  hasNgViolation: boolean;
};

// 不可分単位 (atom)。must_pair で結ばれた 2 人なら長さ 2、それ以外は 1。
type Atom = Member[];

// Fisher-Yatesシャッフル
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// must_pairs から「必ず同じチームに入れる」相棒の id を引くマップを作る。
// chain 防止により各メンバーの相棒は最大 1 人。
function buildPartnerMap(
  members: Member[],
  mustPairs: MustPair[]
): Map<string, string | null> {
  const ids = new Set(members.map((m) => m.id));
  const partnerOf = new Map<string, string | null>();
  for (const m of members) partnerOf.set(m.id, null);
  for (const p of mustPairs) {
    if (!ids.has(p.user_id_a) || !ids.has(p.user_id_b)) continue;
    // 既に登録済みのメンバーが含まれる場合は (chain) スキップ。API で防いでいるが防御的に。
    if (partnerOf.get(p.user_id_a) || partnerOf.get(p.user_id_b)) continue;
    partnerOf.set(p.user_id_a, p.user_id_b);
    partnerOf.set(p.user_id_b, p.user_id_a);
  }
  return partnerOf;
}

// メンバー列を atom 列に変換する。partnerOf に従って 2 人 atom を作り、
// 残りは singleton。
function buildAtoms(members: Member[], partnerOf: Map<string, string | null>): Atom[] {
  const byId = new Map(members.map((m) => [m.id, m]));
  const used = new Set<string>();
  const atoms: Atom[] = [];
  for (const m of members) {
    if (used.has(m.id)) continue;
    const partnerId = partnerOf.get(m.id);
    if (partnerId && byId.has(partnerId) && !used.has(partnerId)) {
      atoms.push([m, byId.get(partnerId)!]);
      used.add(m.id);
      used.add(partnerId);
    } else {
      atoms.push([m]);
      used.add(m.id);
    }
  }
  return atoms;
}

// チーム内の (anchorId を含む) atom のメンバー index 一覧を返す。
function findAtomIndicesInTeam(
  team: Member[],
  anchorId: string,
  partnerOf: Map<string, string | null>
): number[] {
  const partnerId = partnerOf.get(anchorId) ?? null;
  const indices: number[] = [];
  team.forEach((m, i) => {
    if (m.id === anchorId || (partnerId && m.id === partnerId)) indices.push(i);
  });
  return indices;
}

// チームに含まれる重複なしの atom (= index 配列) 一覧
function enumerateAtomsInTeam(
  team: Member[],
  partnerOf: Map<string, string | null>
): number[][] {
  const seen = new Set<number>();
  const result: number[][] = [];
  team.forEach((m, i) => {
    if (seen.has(i)) return;
    const indices = findAtomIndicesInTeam(team, m.id, partnerOf);
    indices.forEach((idx) => seen.add(idx));
    result.push(indices);
  });
  return result;
}

// NGペア違反数をカウント
function countNgViolations(teams: Member[][], ngPairs: NgPair[]): number {
  let count = 0;
  for (const team of teams) {
    const ids = new Set(team.map((m) => m.id));
    for (const ng of ngPairs) {
      if (ids.has(ng.user_id_a) && ids.has(ng.user_id_b)) {
        count++;
      }
    }
  }
  return count;
}

/**
 * 今回の出場メンバーに両方とも含まれる NG ペア / Must ペアだけを対象にする。
 * Member.id と user_id_a / user_id_b は同一のユーザー ID（例: public.users.id）の前提。
 */
function filterPairsForMembers<T extends NgPair>(members: Member[], pairs: T[]): T[] {
  const ids = new Set(members.map((m) => m.id));
  return pairs.filter((p) => ids.has(p.user_id_a) && ids.has(p.user_id_b));
}

// atom 単位でチームに割り当てる (smallest-team-first)。
// 大きい atom (=2 人) を先に置くと最終的なチーム人数の偏りが小さくなる。
function distributeAtomsToTeams(atoms: Atom[], teamCount: number): Member[][] {
  const teams: Member[][] = Array.from({ length: teamCount }, () => []);
  // ランダム順を保ちつつ、大きい atom を先に置くため、size desc で安定ソート前にシャッフル。
  const sorted = shuffle(atoms).sort((a, b) => b.length - a.length);
  for (const atom of sorted) {
    let minIdx = 0;
    for (let i = 1; i < teams.length; i++) {
      if (teams[i].length < teams[minIdx].length) minIdx = i;
    }
    for (const m of atom) teams[minIdx].push(m);
  }
  return teams;
}

// 既存チームに atom 群を追加配分。各 atom は最も小さいチームへ。
function mergeAtomsIntoTeams(existingTeams: Member[][], additionalAtoms: Atom[]): Member[][] {
  const teams = existingTeams.map((t) => [...t]);
  const sorted = shuffle(additionalAtoms).sort((a, b) => b.length - a.length);
  for (const atom of sorted) {
    let minIdx = 0;
    for (let i = 1; i < teams.length; i++) {
      if (teams[i].length < teams[minIdx].length) minIdx = i;
    }
    for (const m of atom) teams[minIdx].push(m);
  }
  return teams;
}

// atom の性別カテゴリを判定。混在 atom は "mixed" 扱い。
function classifyAtomGender(atom: Atom): "male" | "female" | "unknown" | "mixed" {
  const set = new Set(atom.map((m) => m.gender));
  if (set.size > 1) return "mixed";
  const g = atom[0].gender;
  if (g === "男") return "male";
  if (g === "女") return "female";
  return "unknown";
}

// fromTeam の anchorId を含む atom を、別チームの同サイズ atom と入れ替える。
// 同サイズ swap が見つかれば NG 違反 0 を満たすか試す。
function trySwapAtomToOtherTeam(
  result: Member[][],
  fromTeamIdx: number,
  anchorId: string,
  partnerOf: Map<string, string | null>,
  ngPairs: NgPair[]
): boolean {
  const fromTeam = result[fromTeamIdx];
  const fromIndices = findAtomIndicesInTeam(fromTeam, anchorId, partnerOf);
  if (fromIndices.length === 0) return false;
  const fromAtomSize = fromIndices.length;

  const otherTeamIndices = shuffle(
    Array.from({ length: result.length }, (_, i) => i).filter((i) => i !== fromTeamIdx)
  );

  for (const toTeamIdx of otherTeamIndices) {
    const toTeam = result[toTeamIdx];
    const toAtoms = shuffle(enumerateAtomsInTeam(toTeam, partnerOf));
    for (const candIndices of toAtoms) {
      // チーム人数を保つため同サイズ swap のみ
      if (candIndices.length !== fromAtomSize) continue;

      const fromAtom = fromIndices.map((i) => fromTeam[i]);
      const candAtom = candIndices.map((i) => toTeam[i]);

      const newFromTeam = fromTeam
        .filter((_, i) => !fromIndices.includes(i))
        .concat(candAtom);
      const newToTeam = toTeam
        .filter((_, i) => !candIndices.includes(i))
        .concat(fromAtom);

      const newViolationsFrom = countNgViolations([newFromTeam], ngPairs);
      const newViolationsTo = countNgViolations([newToTeam], ngPairs);

      if (newViolationsFrom === 0 && newViolationsTo === 0) {
        result[fromTeamIdx] = newFromTeam;
        result[toTeamIdx] = newToTeam;
        return true;
      }
    }
  }
  return false;
}

// NGペア違反を atom-swap で解消する後処理
function resolveNgViolations(
  teams: Member[][],
  ngPairs: NgPair[],
  partnerOf: Map<string, string | null>
): { teams: Member[][]; resolved: boolean } {
  const result = teams.map((t) => [...t]);
  const maxSwapAttempts = Math.max(80, ngPairs.length * result.length * 24);
  let attempts = 0;

  while (attempts < maxSwapAttempts) {
    let violation: { teamIdx: number; memberA: string; memberB: string } | null = null;
    for (let ti = 0; ti < result.length; ti++) {
      const ids = new Set(result[ti].map((m) => m.id));
      for (const ng of ngPairs) {
        if (ids.has(ng.user_id_a) && ids.has(ng.user_id_b)) {
          violation = { teamIdx: ti, memberA: ng.user_id_a, memberB: ng.user_id_b };
          break;
        }
      }
      if (violation) break;
    }

    if (!violation) return { teams: result, resolved: true };

    const fromTeamIdx = violation.teamIdx;
    let swapped = false;
    for (const moveMemberId of shuffle([violation.memberA, violation.memberB])) {
      if (trySwapAtomToOtherTeam(result, fromTeamIdx, moveMemberId, partnerOf, ngPairs)) {
        swapped = true;
        break;
      }
    }

    if (!swapped) {
      attempts++;
      continue;
    }

    attempts++;
  }

  return { teams: result, resolved: countNgViolations(result, ngPairs) === 0 };
}

// ランダム振り分け（1ラウンド）
function divideRandomOneRound(
  atoms: Atom[],
  teamCount: number,
  ngPairs: NgPair[],
  partnerOf: Map<string, string | null>
): DivideResult {
  let bestTeams: Member[][] = [];
  let bestViolations = Infinity;

  const maxAttempts = ngPairs.length > 0 ? 100 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const teams = distributeAtomsToTeams(atoms, teamCount);
    const violations = countNgViolations(teams, ngPairs);

    if (violations < bestViolations) {
      bestViolations = violations;
      bestTeams = teams.map((t) => [...t]);
    }

    if (bestViolations === 0) break;
  }

  if (bestViolations > 0) {
    const { teams: resolved, resolved: ok } = resolveNgViolations(
      bestTeams,
      ngPairs,
      partnerOf
    );
    bestTeams = resolved;
    bestViolations = ok ? 0 : countNgViolations(resolved, ngPairs);
  }

  return {
    teams: bestTeams,
    hasNgViolation: bestViolations > 0,
  };
}

function divideRandom(
  atoms: Atom[],
  teamCount: number,
  ngPairs: NgPair[],
  partnerOf: Map<string, string | null>
): DivideResult {
  if (ngPairs.length === 0) {
    return divideRandomOneRound(atoms, teamCount, ngPairs, partnerOf);
  }

  const maxRounds = 80;
  let globalBest: DivideResult | null = null;

  for (let round = 0; round < maxRounds; round++) {
    const candidate = divideRandomOneRound(atoms, teamCount, ngPairs, partnerOf);
    if (!candidate.hasNgViolation) {
      return candidate;
    }
    if (
      !globalBest ||
      countNgViolations(candidate.teams, ngPairs) < countNgViolations(globalBest.teams, ngPairs)
    ) {
      globalBest = candidate;
    }
  }

  return globalBest ?? divideRandomOneRound(atoms, teamCount, ngPairs, partnerOf);
}

// 男女均等振り分け（1ラウンド）
// 性別単一 atom を先に分散し、最後に mixed atom を載せる。
// (mixed atom = 性別が混在する must_pair。男女均等の意図とは元々相性が悪いが、
//  ペア制約を優先する。)
function divideGenderEqualOneRound(
  atoms: Atom[],
  teamCount: number,
  ngPairs: NgPair[],
  partnerOf: Map<string, string | null>
): DivideResult {
  let bestTeams: Member[][] = [];
  let bestViolations = Infinity;

  const maxAttempts = ngPairs.length > 0 ? 100 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const males = atoms.filter((a) => classifyAtomGender(a) === "male");
    const females = atoms.filter((a) => classifyAtomGender(a) === "female");
    const unknown = atoms.filter((a) => classifyAtomGender(a) === "unknown");
    const mixed = atoms.filter((a) => classifyAtomGender(a) === "mixed");

    let teams = distributeAtomsToTeams(males, teamCount);
    teams = mergeAtomsIntoTeams(teams, females);
    teams = mergeAtomsIntoTeams(teams, unknown);
    teams = mergeAtomsIntoTeams(teams, mixed);

    const violations = countNgViolations(teams, ngPairs);

    if (violations < bestViolations) {
      bestViolations = violations;
      bestTeams = teams.map((t) => [...t]);
    }

    if (bestViolations === 0) break;
  }

  if (bestViolations > 0) {
    const { teams: resolved, resolved: ok } = resolveNgViolations(
      bestTeams,
      ngPairs,
      partnerOf
    );
    bestTeams = resolved;
    bestViolations = ok ? 0 : countNgViolations(resolved, ngPairs);
  }

  return {
    teams: bestTeams,
    hasNgViolation: bestViolations > 0,
  };
}

function divideGenderEqual(
  atoms: Atom[],
  teamCount: number,
  ngPairs: NgPair[],
  partnerOf: Map<string, string | null>
): DivideResult {
  if (ngPairs.length === 0) {
    return divideGenderEqualOneRound(atoms, teamCount, ngPairs, partnerOf);
  }

  const maxRounds = 80;
  let globalBest: DivideResult | null = null;

  for (let round = 0; round < maxRounds; round++) {
    const candidate = divideGenderEqualOneRound(atoms, teamCount, ngPairs, partnerOf);
    if (!candidate.hasNgViolation) {
      return candidate;
    }
    if (
      !globalBest ||
      countNgViolations(candidate.teams, ngPairs) < countNgViolations(globalBest.teams, ngPairs)
    ) {
      globalBest = candidate;
    }
  }

  return globalBest ?? divideGenderEqualOneRound(atoms, teamCount, ngPairs, partnerOf);
}

// メイン関数：チーム分け実行
export function divideTeams(
  members: Member[],
  teamCount: number,
  method: "random" | "gender_equal",
  ngPairs: NgPair[],
  mustPairs: MustPair[] = []
): DivideResult {
  if (members.length <= 1 || teamCount <= 0) {
    return { teams: [members], hasNgViolation: false };
  }

  // チーム数を参加者数以下に制限
  const effectiveTeamCount = Math.min(teamCount, members.length);

  const relevantNgPairs = filterPairsForMembers(members, ngPairs);
  const relevantMustPairs = filterPairsForMembers(members, mustPairs);

  const partnerOf = buildPartnerMap(members, relevantMustPairs);
  const atoms = buildAtoms(members, partnerOf);

  if (process.env.NODE_ENV === "development" && members.length > 0) {
    if (ngPairs.length > 0 && relevantNgPairs.length === 0) {
      console.warn(
        "[divideTeams] NGペアが1件も適用されませんでした。Member.id と user_id_a / user_id_b が同じIDか、出場メンバーにNGの両名が含まれているか確認してください。"
      );
    } else if (ngPairs.length > relevantNgPairs.length) {
      console.warn(
        `[divideTeams] NGペア ${ngPairs.length - relevantNgPairs.length} 件は出場メンバーに含まれないため無視されました（片方が未選択の可能性）。`
      );
    }
    if (mustPairs.length > relevantMustPairs.length) {
      console.warn(
        `[divideTeams] 必ずペア ${mustPairs.length - relevantMustPairs.length} 件は出場メンバーに含まれないため無視されました。`
      );
    }
  }

  if (method === "gender_equal") {
    return divideGenderEqual(atoms, effectiveTeamCount, relevantNgPairs, partnerOf);
  }

  return divideRandom(atoms, effectiveTeamCount, relevantNgPairs, partnerOf);
}

// ヘルパー：「1チームの人数を指定」→ チーム数に変換
export function calcTeamCount(totalMembers: number, membersPerTeam: number): number {
  return Math.ceil(totalMembers / membersPerTeam);
}
