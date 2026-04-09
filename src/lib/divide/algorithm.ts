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

export type DivideResult = {
  teams: Member[][];
  hasNgViolation: boolean;
};

// Fisher-Yatesシャッフル
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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
 * 今回の出場メンバーに両方とも含まれるNGペアだけを対象にする。
 * Member.id と ng_pairs.user_id_a / user_id_b は同一のユーザーID（例: public.users.id）である必要がある。
 * team_members の行IDだけを Member.id にしていると、ここで全ペアが落ちてNGが効かなくなる。
 */
function filterNgPairsForMembers(members: Member[], ngPairs: NgPair[]): NgPair[] {
  const ids = new Set(members.map((m) => m.id));
  return ngPairs.filter((p) => ids.has(p.user_id_a) && ids.has(p.user_id_b));
}

function trySwapMemberToOtherTeam(
  result: Member[][],
  fromTeamIdx: number,
  moveMemberId: string,
  ngPairs: NgPair[]
): boolean {
  const moveIdx = result[fromTeamIdx].findIndex((m) => m.id === moveMemberId);
  if (moveIdx < 0) return false;

  const otherTeamIndices = shuffle(
    Array.from({ length: result.length }, (_, i) => i).filter((i) => i !== fromTeamIdx)
  );

  for (const toTeamIdx of otherTeamIndices) {
    const candidates = shuffle(Array.from({ length: result[toTeamIdx].length }, (_, i) => i));
    for (const candIdx of candidates) {
      const temp = result[toTeamIdx][candIdx];
      result[toTeamIdx][candIdx] = result[fromTeamIdx][moveIdx];
      result[fromTeamIdx][moveIdx] = temp;

      const newViolationsFrom = countNgViolations([result[fromTeamIdx]], ngPairs);
      const newViolationsTo = countNgViolations([result[toTeamIdx]], ngPairs);

      if (newViolationsFrom === 0 && newViolationsTo === 0) {
        return true;
      }

      result[fromTeamIdx][moveIdx] = result[toTeamIdx][candIdx];
      result[toTeamIdx][candIdx] = temp;
    }
  }
  return false;
}

// NGペア違反をスワップで解消する後処理
function resolveNgViolations(teams: Member[][], ngPairs: NgPair[]): { teams: Member[][]; resolved: boolean } {
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
    // NGペアのどちらを他チームに出すかも試す（片方だけだと解けない配置が多い）
    for (const moveMemberId of shuffle([violation.memberA, violation.memberB])) {
      if (trySwapMemberToOtherTeam(result, fromTeamIdx, moveMemberId, ngPairs)) {
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

// メンバーをN個のチームに均等に割り当て
function distributeToTeams(members: Member[], teamCount: number): Member[][] {
  const teams: Member[][] = Array.from({ length: teamCount }, () => []);
  members.forEach((member, i) => {
    teams[i % teamCount].push(member);
  });
  return teams;
}

// 2つのチーム配列をマージ（既存チームに追加メンバーを均等に配分）
function mergeIntoTeams(existingTeams: Member[][], additionalMembers: Member[]): Member[][] {
  const teams = existingTeams.map((t) => [...t]);

  // 人数が少ないチームから優先的に割り当て
  for (const member of additionalMembers) {
    let minIdx = 0;
    let minSize = teams[0].length;
    for (let i = 1; i < teams.length; i++) {
      if (teams[i].length < minSize) {
        minSize = teams[i].length;
        minIdx = i;
      }
    }
    teams[minIdx].push(member);
  }

  return teams;
}

// ランダム振り分け（1ラウンド）
function divideRandomOneRound(members: Member[], teamCount: number, ngPairs: NgPair[]): DivideResult {
  let bestTeams: Member[][] = [];
  let bestViolations = Infinity;

  const maxAttempts = ngPairs.length > 0 ? 100 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shuffled = shuffle(members);
    const teams = distributeToTeams(shuffled, teamCount);
    const violations = countNgViolations(teams, ngPairs);

    if (violations < bestViolations) {
      bestViolations = violations;
      bestTeams = teams.map((t) => [...t]);
    }

    if (bestViolations === 0) break;
  }

  if (bestViolations > 0) {
    const { teams: resolved, resolved: ok } = resolveNgViolations(bestTeams, ngPairs);
    bestTeams = resolved;
    bestViolations = ok ? 0 : countNgViolations(resolved, ngPairs);
  }

  return {
    teams: bestTeams,
    hasNgViolation: bestViolations > 0,
  };
}

// 再抽選でもNGを満たしやすくするため、複数ラウンドで最初に違反0になった結果を採用
function divideRandom(members: Member[], teamCount: number, ngPairs: NgPair[]): DivideResult {
  if (ngPairs.length === 0) {
    return divideRandomOneRound(members, teamCount, ngPairs);
  }

  const maxRounds = 80;
  let globalBest: DivideResult | null = null;

  for (let round = 0; round < maxRounds; round++) {
    const candidate = divideRandomOneRound(members, teamCount, ngPairs);
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

  return globalBest ?? divideRandomOneRound(members, teamCount, ngPairs);
}

// 男女均等振り分け（1ラウンド）
function divideGenderEqualOneRound(members: Member[], teamCount: number, ngPairs: NgPair[]): DivideResult {
  let bestTeams: Member[][] = [];
  let bestViolations = Infinity;

  const maxAttempts = ngPairs.length > 0 ? 100 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const males = shuffle(members.filter((m) => m.gender === "男"));
    const females = shuffle(members.filter((m) => m.gender === "女"));
    const unknown = shuffle(members.filter((m) => m.gender === "未設定"));

    let teams = distributeToTeams(males, teamCount);
    teams = mergeIntoTeams(teams, females);
    teams = mergeIntoTeams(teams, unknown);

    const violations = countNgViolations(teams, ngPairs);

    if (violations < bestViolations) {
      bestViolations = violations;
      bestTeams = teams.map((t) => [...t]);
    }

    if (bestViolations === 0) break;
  }

  if (bestViolations > 0) {
    const { teams: resolved, resolved: ok } = resolveNgViolations(bestTeams, ngPairs);
    bestTeams = resolved;
    bestViolations = ok ? 0 : countNgViolations(resolved, ngPairs);
  }

  return {
    teams: bestTeams,
    hasNgViolation: bestViolations > 0,
  };
}

function divideGenderEqual(members: Member[], teamCount: number, ngPairs: NgPair[]): DivideResult {
  if (ngPairs.length === 0) {
    return divideGenderEqualOneRound(members, teamCount, ngPairs);
  }

  const maxRounds = 80;
  let globalBest: DivideResult | null = null;

  for (let round = 0; round < maxRounds; round++) {
    const candidate = divideGenderEqualOneRound(members, teamCount, ngPairs);
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

  return globalBest ?? divideGenderEqualOneRound(members, teamCount, ngPairs);
}

// メイン関数：チーム分け実行
export function divideTeams(
  members: Member[],
  teamCount: number,
  method: "random" | "gender_equal",
  ngPairs: NgPair[]
): DivideResult {
  if (members.length <= 1 || teamCount <= 0) {
    return { teams: [members], hasNgViolation: false };
  }

  // チーム数を参加者数以下に制限
  const effectiveTeamCount = Math.min(teamCount, members.length);

  const relevantNgPairs = filterNgPairsForMembers(members, ngPairs);

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
  }

  if (method === "gender_equal") {
    return divideGenderEqual(members, effectiveTeamCount, relevantNgPairs);
  }

  return divideRandom(members, effectiveTeamCount, relevantNgPairs);
}

// ヘルパー：「1チームの人数を指定」→ チーム数に変換
export function calcTeamCount(totalMembers: number, membersPerTeam: number): number {
  return Math.ceil(totalMembers / membersPerTeam);
}
