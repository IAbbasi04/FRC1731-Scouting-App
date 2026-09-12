import type { TbaMatch } from "@/types/frc";

const OUTLIER_MULTIPLIER = 1.5;
const RIDGE = 1e-6;

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  const next = sorted[base + 1];
  return next === undefined ? sorted[base] : sorted[base] + rest * (next - sorted[base]);
}

function solveLinearSystem(matrix: number[][], vector: number[]) {
  const n = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[pivot][col])) pivot = row;
    }

    if (Math.abs(augmented[pivot][col]) < 1e-10) continue;
    [augmented[col], augmented[pivot]] = [augmented[pivot], augmented[col]];

    const divisor = augmented[col][col];
    for (let j = col; j <= n; j += 1) augmented[col][j] /= divisor;

    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = augmented[row][col];
      if (Math.abs(factor) < 1e-12) continue;
      for (let j = col; j <= n; j += 1) augmented[row][j] -= factor * augmented[col][j];
    }
  }

  return augmented.map((row) => Number.isFinite(row[n]) ? row[n] : 0);
}

export type FilteredOprResult = {
  oprs: Record<string, number>;
  qualificationMatchCount: number;
  retainedMatchCount: number;
  removedMatchCount: number;
  lowerScoreFence: number | null;
  upperScoreFence: number | null;
};

export function computeFilteredOpr(matches: TbaMatch[]): FilteredOprResult {
  const qualifications = matches.filter((match) =>
    match.comp_level === "qm" && match.alliances.red.score >= 0 && match.alliances.blue.score >= 0,
  );

  if (!qualifications.length) {
    return { oprs: {}, qualificationMatchCount: 0, retainedMatchCount: 0, removedMatchCount: 0, lowerScoreFence: null, upperScoreFence: null };
  }

  const scores = qualifications.flatMap((match) => [match.alliances.red.score, match.alliances.blue.score]).sort((a, b) => a - b);
  const q1 = quantile(scores, 0.25);
  const q3 = quantile(scores, 0.75);
  const iqr = q3 - q1;
  const lowerScoreFence = q1 - OUTLIER_MULTIPLIER * iqr;
  const upperScoreFence = q3 + OUTLIER_MULTIPLIER * iqr;

  const retained = qualifications.filter((match) => {
    const red = match.alliances.red.score;
    const blue = match.alliances.blue.score;
    return red >= lowerScoreFence && red <= upperScoreFence && blue >= lowerScoreFence && blue <= upperScoreFence;
  });

  const teamKeys = Array.from(new Set(retained.flatMap((match) => [...match.alliances.red.team_keys, ...match.alliances.blue.team_keys]))).sort();
  if (!teamKeys.length || retained.length < 2) {
    return { oprs: {}, qualificationMatchCount: qualifications.length, retainedMatchCount: retained.length, removedMatchCount: qualifications.length - retained.length, lowerScoreFence, upperScoreFence };
  }

  const index = new Map(teamKeys.map((key, i) => [key, i]));
  const size = teamKeys.length;
  const ata = Array.from({ length: size }, () => Array(size).fill(0));
  const aty = Array(size).fill(0);

  for (const match of retained) {
    for (const alliance of [match.alliances.red, match.alliances.blue]) {
      const indices = alliance.team_keys.map((key) => index.get(key)).filter((value): value is number => value !== undefined);
      for (const i of indices) {
        aty[i] += alliance.score;
        for (const j of indices) ata[i][j] += 1;
      }
    }
  }

  for (let i = 0; i < size; i += 1) ata[i][i] += RIDGE;
  const solution = solveLinearSystem(ata, aty);
  const oprs = Object.fromEntries(teamKeys.map((key, i) => [key, solution[i]]));

  return { oprs, qualificationMatchCount: qualifications.length, retainedMatchCount: retained.length, removedMatchCount: qualifications.length - retained.length, lowerScoreFence, upperScoreFence };
}
