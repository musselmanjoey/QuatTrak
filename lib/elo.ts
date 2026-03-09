const K_FACTOR = 32;
const DEFAULT_RATING = 1200;

export { K_FACTOR, DEFAULT_RATING };

/**
 * Calculate expected score for team A vs team B.
 * Based on average Elo of each team.
 */
export function expectedScore(teamAAvgElo: number, teamBAvgElo: number): number {
  return 1 / (1 + Math.pow(10, (teamBAvgElo - teamAAvgElo) / 400));
}

/**
 * Calculate new Elo ratings for all players after a match.
 * Returns a map of player_id -> new_elo.
 */
export function calculateEloChanges(
  team1: { id: number; elo: number }[],
  team2: { id: number; elo: number }[],
  winningTeam: 1 | 2
): Map<number, number> {
  const team1Avg = team1.reduce((sum, p) => sum + p.elo, 0) / team1.length;
  const team2Avg = team2.reduce((sum, p) => sum + p.elo, 0) / team2.length;

  const expected1 = expectedScore(team1Avg, team2Avg);
  const expected2 = 1 - expected1;

  const result = new Map<number, number>();

  for (const player of team1) {
    const actual = winningTeam === 1 ? 1 : 0;
    const newElo = Math.round(player.elo + K_FACTOR * (actual - expected1));
    result.set(player.id, newElo);
  }

  for (const player of team2) {
    const actual = winningTeam === 2 ? 1 : 0;
    const newElo = Math.round(player.elo + K_FACTOR * (actual - expected2));
    result.set(player.id, newElo);
  }

  return result;
}
