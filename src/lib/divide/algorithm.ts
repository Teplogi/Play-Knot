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

// ランダム振り分け
function divideRandom(members: Member[], teamCount: number, ngPairs: NgPair[]): DivideResult {
  let bestTeams: Member[][] = [];
  let bestViolations = Infinity;

  // 最大100回試行し、NG違反が最も少ない組み合わせを採用
  const maxAttempts = ngPairs.length > 0 ? 100 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shuffled = shuffle(members);
    const teams = distributeToTeams(shuffled, teamCount);
    const violations = countNgViolations(teams, ngPairs);

    if (violations < bestViolations) {
      bestViolations = violations;
      bestTeams = teams;
    }

    // NG違反0なら即採用
    if (bestViolations === 0) break;
  }

  return {
    teams: bestTeams,
    hasNgViolation: bestViolations > 0,
  };
}

// 男女均等振り分け
function divideGenderEqual(members: Member[], teamCount: number, ngPairs: NgPair[]): DivideResult {
  let bestTeams: Member[][] = [];
  let bestViolations = Infinity;

  const maxAttempts = ngPairs.length > 0 ? 100 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 性別ごとに分類
    const males = shuffle(members.filter((m) => m.gender === "男"));
    const females = shuffle(members.filter((m) => m.gender === "女"));
    const unknown = shuffle(members.filter((m) => m.gender === "未設定"));

    // 男性を均等に割り当て
    let teams = distributeToTeams(males, teamCount);

    // 女性を均等に追加
    teams = mergeIntoTeams(teams, females);

    // 未設定を均等に追加
    teams = mergeIntoTeams(teams, unknown);

    const violations = countNgViolations(teams, ngPairs);

    if (violations < bestViolations) {
      bestViolations = violations;
      bestTeams = teams;
    }

    if (bestViolations === 0) break;
  }

  return {
    teams: bestTeams,
    hasNgViolation: bestViolations > 0,
  };
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

  if (method === "gender_equal") {
    return divideGenderEqual(members, effectiveTeamCount, ngPairs);
  }

  return divideRandom(members, effectiveTeamCount, ngPairs);
}

// ヘルパー：「1チームの人数を指定」→ チーム数に変換
export function calcTeamCount(totalMembers: number, membersPerTeam: number): number {
  return Math.ceil(totalMembers / membersPerTeam);
}
