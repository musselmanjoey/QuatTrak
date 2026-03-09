interface PlayerForMatch {
  id: number;
  elo_rating: number;
  games_this_session: number;
}

interface TeamSplit {
  team1: PlayerForMatch[];
  team2: PlayerForMatch[];
  eloDiff: number;
}

/**
 * Generate all combinations of choosing k items from an array.
 */
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];

  const result: T[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const rest = combinations(arr.slice(i + 1), k - 1);
    for (const combo of rest) {
      result.push([arr[i], ...combo]);
    }
  }
  return result;
}

/**
 * Find the most balanced team split for a group of players.
 * Exhaustive search — feasible for 4-8 players (2v2 through 4v4).
 */
function findBestSplit(players: PlayerForMatch[]): TeamSplit {
  const teamSize = players.length / 2;
  const team1Options = combinations(players, teamSize);

  let bestSplit: TeamSplit | null = null;

  for (const team1 of team1Options) {
    const team1Ids = new Set(team1.map(p => p.id));
    const team2 = players.filter(p => !team1Ids.has(p.id));

    const team1Elo = team1.reduce((sum, p) => sum + p.elo_rating, 0) / team1.length;
    const team2Elo = team2.reduce((sum, p) => sum + p.elo_rating, 0) / team2.length;
    const eloDiff = Math.abs(team1Elo - team2Elo);

    if (!bestSplit || eloDiff < bestSplit.eloDiff) {
      bestSplit = { team1, team2, eloDiff };
    }
  }

  return bestSplit!;
}

/**
 * Auto-draft: given all active players and a team size, generate balanced matches.
 * Players with fewest games this session get priority (sit-out fairness).
 */
export function generateAutoMatches(
  players: PlayerForMatch[],
  teamSize: number
): { team1: number[]; team2: number[] }[] {
  const matchSize = teamSize * 2;

  if (players.length < matchSize) {
    return [];
  }

  // Sort by fewest games this session first (sit-out priority), then by id for stability
  const sorted = [...players].sort((a, b) => {
    if (a.games_this_session !== b.games_this_session) {
      return a.games_this_session - b.games_this_session;
    }
    return a.id - b.id;
  });

  const matches: { team1: number[]; team2: number[] }[] = [];
  const assigned = new Set<number>();

  // Greedily assign groups of players to matches
  while (true) {
    const available = sorted.filter(p => !assigned.has(p.id));
    if (available.length < matchSize) break;

    const group = available.slice(0, matchSize);
    const split = findBestSplit(group);

    matches.push({
      team1: split.team1.map(p => p.id),
      team2: split.team2.map(p => p.id),
    });

    for (const p of group) {
      assigned.add(p.id);
    }
  }

  return matches;
}
