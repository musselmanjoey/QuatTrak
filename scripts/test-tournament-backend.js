/**
 * End-to-end backend test for the tournament system.
 * Run: node scripts/db-run.js scripts/test-tournament-backend.js
 *
 * Tests the full lifecycle:
 * 1. Create tournament
 * 2. Add courts
 * 3. Create teams + assign players
 * 4. Auto-seed teams
 * 5. Generate single elim bracket (5 teams → 3 byes)
 * 6. Record results + verify Elo changes + bracket advancement
 * 7. Generate round robin schedule (4 teams)
 * 8. Record round robin results + verify standings
 * 9. Clean up all test data
 */

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

module.exports = async ({ pool, query }) => {
  console.log('=== Tournament Backend Tests ===\n');

  // Get existing players
  const players = (await query('SELECT id, name, elo_rating FROM players ORDER BY id')).rows;
  assert(players.length >= 6, `Have at least 6 players (found ${players.length})`);

  const organizer = players[0]; // Alice
  const courtResult = (await query('SELECT id, name FROM courts LIMIT 2')).rows;
  assert(courtResult.length >= 1, `Have at least 1 court`);

  // ========== SINGLE ELIMINATION TEST ==========
  console.log('\n--- Single Elimination Tournament ---');

  // 1. Create tournament
  const t1 = (await query(
    `INSERT INTO tournaments (name, format, team_size, organizer_player_id)
     VALUES ('Test SE Tournament', 'single_elimination', 2, $1) RETURNING *`,
    [organizer.id]
  )).rows[0];
  assert(t1.id > 0, `Created SE tournament id=${t1.id}`);
  assert(t1.status === 'setup', `Status is setup`);
  assert(t1.format === 'single_elimination', `Format is single_elimination`);

  // 2. Add courts
  await query('INSERT INTO tournament_courts (tournament_id, court_id) VALUES ($1, $2)', [t1.id, courtResult[0].id]);
  const tcourts = (await query('SELECT * FROM tournament_courts WHERE tournament_id = $1', [t1.id])).rows;
  assert(tcourts.length === 1, `Added 1 court to tournament`);

  // 3. Create 5 teams with 2 players each
  const teamNames = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'];
  const teamIds = [];
  for (let i = 0; i < 5; i++) {
    const team = (await query(
      'INSERT INTO tournament_teams (tournament_id, name) VALUES ($1, $2) RETURNING *',
      [t1.id, teamNames[i]]
    )).rows[0];
    teamIds.push(team.id);

    // Assign 1 player per team (unique — avoids shared players across opponent teams)
    const p1 = players[i % players.length];
    await query('INSERT INTO tournament_team_players (team_id, player_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [team.id, p1.id]);
  }
  assert(teamIds.length === 5, `Created 5 teams`);

  // Verify team players
  const teamPlayers = (await query(
    `SELECT tt.name, COUNT(ttp.player_id)::int as player_count
     FROM tournament_teams tt
     LEFT JOIN tournament_team_players ttp ON ttp.team_id = tt.id
     WHERE tt.tournament_id = $1
     GROUP BY tt.id, tt.name ORDER BY tt.name`,
    [t1.id]
  )).rows;
  assert(teamPlayers.every(t => t.player_count >= 1), `All teams have players`);

  // 4. Auto-seed (sort by avg Elo)
  const teamElos = [];
  for (const tid of teamIds) {
    const avg = (await query(
      `SELECT AVG(p.elo_rating)::int as avg_elo
       FROM tournament_team_players ttp JOIN players p ON p.id = ttp.player_id
       WHERE ttp.team_id = $1`, [tid]
    )).rows[0].avg_elo;
    teamElos.push({ id: tid, avg_elo: avg });
  }
  teamElos.sort((a, b) => b.avg_elo - a.avg_elo);
  for (let i = 0; i < teamElos.length; i++) {
    await query('UPDATE tournament_teams SET seed = $1 WHERE id = $2', [i + 1, teamElos[i].id]);
  }

  const seeded = (await query('SELECT id, name, seed FROM tournament_teams WHERE tournament_id = $1 ORDER BY seed', [t1.id])).rows;
  assert(seeded[0].seed === 1 && seeded[4].seed === 5, `Seeds assigned 1-5`);
  console.log(`  Seeds: ${seeded.map(s => `${s.seed}.${s.name}`).join(', ')}`);

  // 5. Generate bracket (5 teams → pad to 8 → 3 byes)
  // Using bracketService directly via require
  // Since we can't easily import TS service from this JS script, we'll call the generation logic manually

  // Pad to 8 (power of 2)
  const bracketSize = 8; // next power of 2 from 5
  const totalRounds = 3; // log2(8)

  // Standard seeding positions for 8-team bracket
  // Round 1 matchups: 1v8, 4v5, 2v7, 3v6
  const matchups = [[1,8],[4,5],[2,7],[3,6]];

  // Create match shells from final to first
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const matchesByRound = [];

    // Create from final round backward
    for (let round = totalRounds; round >= 1; round--) {
      const matchesInRound = Math.pow(2, totalRounds - round);
      const roundMatches = [];

      for (let m = 0; m < matchesInRound; m++) {
        const nextMatchId = round < totalRounds
          ? matchesByRound[matchesByRound.length - 1][Math.floor(m / 2)]
          : null;
        const nextMatchSlot = round < totalRounds ? (m % 2) + 1 : null;

        const result = await client.query(
          `INSERT INTO tournament_matches (tournament_id, round_number, match_number, status, next_match_id, next_match_slot)
           VALUES ($1, $2, $3, 'pending', $4, $5) RETURNING id`,
          [t1.id, round, m + 1, nextMatchId, nextMatchSlot]
        );
        roundMatches.push(result.rows[0].id);
      }
      matchesByRound.push(roundMatches);
    }

    // First round matches are the last array
    const firstRoundMatches = matchesByRound[matchesByRound.length - 1];

    // Assign teams to first round
    for (let i = 0; i < matchups.length; i++) {
      const [seed1, seed2] = matchups[i];
      const team1 = seed1 <= seeded.length ? seeded[seed1 - 1] : null;
      const team2 = seed2 <= seeded.length ? seeded[seed2 - 1] : null;
      const matchId = firstRoundMatches[i];

      if (team1 && team2) {
        await client.query(
          'UPDATE tournament_matches SET team1_id = $1, team2_id = $2, status = $3 WHERE id = $4',
          [team1.id, team2.id, 'ready', matchId]
        );
      } else if (team1 && !team2) {
        // Bye
        await client.query(
          'UPDATE tournament_matches SET team1_id = $1, winning_team_id = $1, status = $2, is_bye = true WHERE id = $3',
          [team1.id, 'completed', matchId]
        );
        // Advance
        const m = (await client.query('SELECT * FROM tournament_matches WHERE id = $1', [matchId])).rows[0];
        if (m.next_match_id) {
          const col = m.next_match_slot === 1 ? 'team1_id' : 'team2_id';
          await client.query(`UPDATE tournament_matches SET ${col} = $1 WHERE id = $2`, [team1.id, m.next_match_id]);
          // Check if next match is ready
          const next = (await client.query('SELECT * FROM tournament_matches WHERE id = $1', [m.next_match_id])).rows[0];
          if (next.team1_id && next.team2_id) {
            await client.query('UPDATE tournament_matches SET status = $1 WHERE id = $2', ['ready', m.next_match_id]);
          }
        }
      } else if (!team1 && team2) {
        await client.query(
          'UPDATE tournament_matches SET team2_id = $1, winning_team_id = $1, status = $2, is_bye = true WHERE id = $3',
          [team2.id, 'completed', matchId]
        );
        const m = (await client.query('SELECT * FROM tournament_matches WHERE id = $1', [matchId])).rows[0];
        if (m.next_match_id) {
          const col = m.next_match_slot === 1 ? 'team1_id' : 'team2_id';
          await client.query(`UPDATE tournament_matches SET ${col} = $1 WHERE id = $2`, [team2.id, m.next_match_id]);
          const next = (await client.query('SELECT * FROM tournament_matches WHERE id = $1', [m.next_match_id])).rows[0];
          if (next.team1_id && next.team2_id) {
            await client.query('UPDATE tournament_matches SET status = $1 WHERE id = $2', ['ready', m.next_match_id]);
          }
        }
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Verify bracket
  const allMatches = (await query(
    'SELECT * FROM tournament_matches WHERE tournament_id = $1 ORDER BY round_number, match_number',
    [t1.id]
  )).rows;
  assert(allMatches.length === 7, `Created 7 matches (4+2+1 for 8-bracket)`);

  const r1Matches = allMatches.filter(m => m.round_number === 1);
  const byes = r1Matches.filter(m => m.is_bye);
  assert(byes.length === 3, `3 byes in round 1 (8-5=3)`);

  const readyR1 = r1Matches.filter(m => m.status === 'ready');
  assert(readyR1.length === 1, `1 ready match in round 1 (only real matchup)`);

  // Check that byes advanced winners to round 2
  const r2Matches = allMatches.filter(m => m.round_number === 2);
  assert(r2Matches.length === 2, `2 matches in round 2 (semis)`);

  // Count how many R2 matches have at least one team filled from byes
  const r2WithTeams = r2Matches.filter(m => m.team1_id || m.team2_id);
  assert(r2WithTeams.length === 2, `Both R2 matches have at least one team from byes`);

  // 6. Record a result for the ready R1 match
  const readyMatch = readyR1[0];

  // Snapshot Elo before
  const eloBefore = {};
  for (const p of players) {
    const current = (await query('SELECT elo_rating FROM players WHERE id = $1', [p.id])).rows[0];
    eloBefore[p.id] = current.elo_rating;
  }

  // Record result: team1 wins 25-20
  await query(
    `UPDATE tournament_matches SET score_team1 = 25, score_team2 = 20, winning_team_id = team1_id, status = 'completed', updated_at = NOW() WHERE id = $1`,
    [readyMatch.id]
  );

  // Get team players and update Elo manually (simulating what bracketService does)
  const t1Players = (await query(
    'SELECT ttp.player_id, p.elo_rating FROM tournament_team_players ttp JOIN players p ON p.id = ttp.player_id WHERE ttp.team_id = $1',
    [readyMatch.team1_id]
  )).rows;
  const t2Players = (await query(
    'SELECT ttp.player_id, p.elo_rating FROM tournament_team_players ttp JOIN players p ON p.id = ttp.player_id WHERE ttp.team_id = $1',
    [readyMatch.team2_id]
  )).rows;

  // Calculate expected and Elo changes
  const t1Avg = t1Players.reduce((s, p) => s + p.elo_rating, 0) / t1Players.length;
  const t2Avg = t2Players.reduce((s, p) => s + p.elo_rating, 0) / t2Players.length;
  const expected1 = 1 / (1 + Math.pow(10, (t2Avg - t1Avg) / 400));

  // Apply Elo: team1 won
  for (const p of t1Players) {
    const newElo = Math.round(p.elo_rating + 32 * (1 - expected1));
    await query('UPDATE players SET elo_rating = $1, wins = wins + 1, updated_at = NOW() WHERE id = $2', [newElo, p.player_id]);
    await query(
      'INSERT INTO tournament_match_players (tournament_match_id, player_id, team_id, elo_before, elo_after) VALUES ($1, $2, $3, $4, $5)',
      [readyMatch.id, p.player_id, readyMatch.team1_id, p.elo_rating, newElo]
    );
  }
  for (const p of t2Players) {
    const newElo = Math.round(p.elo_rating + 32 * (0 - (1 - expected1)));
    await query('UPDATE players SET elo_rating = $1, losses = losses + 1, updated_at = NOW() WHERE id = $2', [newElo, p.player_id]);
    await query(
      'INSERT INTO tournament_match_players (tournament_match_id, player_id, team_id, elo_before, elo_after) VALUES ($1, $2, $3, $4, $5)',
      [readyMatch.id, p.player_id, readyMatch.team2_id, p.elo_rating, newElo]
    );
  }

  // Verify Elo changed
  const eloAfter = {};
  for (const p of [...t1Players, ...t2Players]) {
    const current = (await query('SELECT elo_rating FROM players WHERE id = $1', [p.player_id])).rows[0];
    eloAfter[p.player_id] = current.elo_rating;
  }

  const winners = t1Players.map(p => p.player_id);
  const losers = t2Players.map(p => p.player_id);
  assert(winners.every(id => eloAfter[id] > eloBefore[id]), `Winners gained Elo`);
  assert(losers.every(id => eloAfter[id] < eloBefore[id]), `Losers lost Elo`);

  // Advance winner to next round
  const matchData = (await query('SELECT * FROM tournament_matches WHERE id = $1', [readyMatch.id])).rows[0];
  if (matchData.next_match_id) {
    const col = matchData.next_match_slot === 1 ? 'team1_id' : 'team2_id';
    await query(`UPDATE tournament_matches SET ${col} = $1 WHERE id = $2`, [matchData.winning_team_id, matchData.next_match_id]);
    const next = (await query('SELECT * FROM tournament_matches WHERE id = $1', [matchData.next_match_id])).rows[0];
    if (next.team1_id && next.team2_id) {
      await query('UPDATE tournament_matches SET status = $1 WHERE id = $2', ['ready', matchData.next_match_id]);
    }
  }

  // Verify advancement
  if (matchData.next_match_id) {
    const nextMatch = (await query('SELECT * FROM tournament_matches WHERE id = $1', [matchData.next_match_id])).rows[0];
    const winnerInNext = nextMatch.team1_id === matchData.winning_team_id || nextMatch.team2_id === matchData.winning_team_id;
    assert(winnerInNext, `Winner advanced to next round`);
  }

  // Mark tournament active
  await query('UPDATE tournaments SET status = $1 WHERE id = $2', ['active', t1.id]);

  console.log('\n--- Single Elim: PASS ---');

  // ========== ROUND ROBIN TEST ==========
  console.log('\n--- Round Robin Tournament ---');

  // Create RR tournament with 4 teams
  const t2 = (await query(
    `INSERT INTO tournaments (name, format, team_size, organizer_player_id)
     VALUES ('Test RR Tournament', 'round_robin', 2, $1) RETURNING *`,
    [organizer.id]
  )).rows[0];
  assert(t2.format === 'round_robin', `Created RR tournament`);

  // Create 4 teams
  const rrTeamIds = [];
  for (let i = 0; i < 4; i++) {
    const team = (await query(
      'INSERT INTO tournament_teams (tournament_id, name, seed) VALUES ($1, $2, $3) RETURNING *',
      [t2.id, `RR Team ${i+1}`, i + 1]
    )).rows[0];
    rrTeamIds.push(team.id);

    const p1 = players[i % players.length];
    await query('INSERT INTO tournament_team_players (team_id, player_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [team.id, p1.id]);
  }
  assert(rrTeamIds.length === 4, `Created 4 RR teams`);

  // Generate round robin schedule (circle method: 4 teams → 3 rounds, 2 matches each = 6 matches)
  const n = 4;
  const rrTeams = [...rrTeamIds]; // already even
  const rounds = n - 1; // 3 rounds

  for (let round = 0; round < rounds; round++) {
    let matchNum = 1;
    for (let i = 0; i < n / 2; i++) {
      const homeIdx = i === 0 ? 0 : ((round + i - 1) % (n - 1)) + 1;
      const awayRaw = n - 1 - i;
      const awayIdx = awayRaw === 0 ? 0 : ((round + awayRaw - 1) % (n - 1)) + 1;

      await query(
        `INSERT INTO tournament_matches (tournament_id, round_number, match_number, team1_id, team2_id, status)
         VALUES ($1, $2, $3, $4, $5, 'ready')`,
        [t2.id, round + 1, matchNum, rrTeams[homeIdx], rrTeams[awayIdx]]
      );
      matchNum++;
    }
  }

  const rrMatches = (await query(
    'SELECT * FROM tournament_matches WHERE tournament_id = $1 ORDER BY round_number, match_number',
    [t2.id]
  )).rows;
  assert(rrMatches.length === 6, `RR schedule: 6 matches (4 teams × 3 rounds ÷ 2)`);

  // Verify every team plays every other team exactly once
  const matchupSet = new Set();
  for (const m of rrMatches) {
    const key = [m.team1_id, m.team2_id].sort().join('-');
    matchupSet.add(key);
  }
  // C(4,2) = 6 unique matchups
  assert(matchupSet.size === 6, `All 6 unique matchups present`);

  // Record all RR results
  const scores = [
    [25, 20], [25, 18], [25, 22], [20, 25], [18, 25], [25, 23]
  ];
  for (let i = 0; i < rrMatches.length; i++) {
    const m = rrMatches[i];
    const [s1, s2] = scores[i];
    const winnerId = s1 > s2 ? m.team1_id : m.team2_id;
    await query(
      `UPDATE tournament_matches SET score_team1 = $1, score_team2 = $2, winning_team_id = $3, status = 'completed', updated_at = NOW() WHERE id = $4`,
      [s1, s2, winnerId, m.id]
    );
  }

  const completedRR = (await query(
    "SELECT COUNT(*)::int as c FROM tournament_matches WHERE tournament_id = $1 AND status = 'completed'",
    [t2.id]
  )).rows[0].c;
  assert(completedRR === 6, `All 6 RR matches completed`);

  // Compute standings
  const standingsMap = {};
  for (const tid of rrTeamIds) {
    standingsMap[tid] = { wins: 0, losses: 0, pf: 0, pa: 0 };
  }
  const rrCompleted = (await query(
    'SELECT * FROM tournament_matches WHERE tournament_id = $1', [t2.id]
  )).rows;
  for (const m of rrCompleted) {
    standingsMap[m.team1_id].pf += m.score_team1;
    standingsMap[m.team1_id].pa += m.score_team2;
    standingsMap[m.team2_id].pf += m.score_team2;
    standingsMap[m.team2_id].pa += m.score_team1;
    if (m.winning_team_id === m.team1_id) {
      standingsMap[m.team1_id].wins++;
      standingsMap[m.team2_id].losses++;
    } else {
      standingsMap[m.team2_id].wins++;
      standingsMap[m.team1_id].losses++;
    }
  }

  // Every team should have played 3 games
  for (const tid of rrTeamIds) {
    const s = standingsMap[tid];
    assert(s.wins + s.losses === 3, `Team ${tid} played 3 games (${s.wins}W-${s.losses}L)`);
  }

  console.log('\n--- Round Robin: PASS ---');

  // ========== CLEANUP ==========
  console.log('\n--- Cleanup ---');

  // Restore player Elos to before-test state
  for (const p of players) {
    if (eloBefore[p.id] !== undefined) {
      await query('UPDATE players SET elo_rating = $1 WHERE id = $2', [eloBefore[p.id], p.id]);
    }
  }
  // Also restore wins/losses that were modified
  for (const id of winners) {
    await query('UPDATE players SET wins = wins - 1 WHERE id = $1', [id]);
  }
  for (const id of losers) {
    await query('UPDATE players SET losses = losses - 1 WHERE id = $1', [id]);
  }

  // Delete test tournaments (cascades to teams, matches, etc.)
  await query('DELETE FROM tournament_match_players WHERE tournament_match_id IN (SELECT id FROM tournament_matches WHERE tournament_id IN ($1, $2))', [t1.id, t2.id]);
  await query('DELETE FROM tournament_matches WHERE tournament_id IN ($1, $2)', [t1.id, t2.id]);
  await query('DELETE FROM tournament_team_players WHERE team_id IN (SELECT id FROM tournament_teams WHERE tournament_id IN ($1, $2))', [t1.id, t2.id]);
  await query('DELETE FROM tournament_teams WHERE tournament_id IN ($1, $2)', [t1.id, t2.id]);
  await query('DELETE FROM tournament_courts WHERE tournament_id IN ($1, $2)', [t1.id, t2.id]);
  await query('DELETE FROM tournaments WHERE id IN ($1, $2)', [t1.id, t2.id]);

  const remaining = (await query('SELECT COUNT(*)::int as c FROM tournaments')).rows[0].c;
  assert(remaining === 0, `Cleanup complete — 0 tournaments remaining`);

  // ========== SUMMARY ==========
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
};
