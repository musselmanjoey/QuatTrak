/**
 * Seeds two test tournaments:
 * 1. "Spring Showdown" — 16-team single elimination, partially played (quarters done, semis ready)
 * 2. "Round Robin Classic" — 6-team round robin, fresh and ready to play
 *
 * Run: node scripts/db-run.js scripts/seed-tournament-tests.js
 */

const TEAM_NAMES_16 = [
  'Thunder', 'Vipers', 'Blaze', 'Sharks',
  'Rockets', 'Storm', 'Titans', 'Wolves',
  'Phoenix', 'Cobras', 'Fury', 'Hawks',
  'Avalanche', 'Raptors', 'Inferno', 'Jaguars',
];

const RR_TEAM_NAMES = ['Aces', 'Kings', 'Queens', 'Jacks', 'Tens', 'Nines'];

// First names for generated players
const FIRST_NAMES = [
  'Liam', 'Noah', 'Oliver', 'James', 'Elijah', 'William', 'Henry', 'Lucas',
  'Ben', 'Jack', 'Leo', 'Daniel', 'Matt', 'Owen', 'Sam', 'Ryan',
  'Nate', 'Isaac', 'Luke', 'Caleb', 'Aaron', 'Ian', 'Eli', 'Max',
  'Connor', 'Dylan', 'Kyle', 'Jake', 'Tyler', 'Gavin', 'Cole', 'Drew',
];

module.exports = async ({ pool, query }) => {
  // Get existing players
  const existing = (await query('SELECT id, name FROM players ORDER BY id')).rows;
  console.log(`Existing players: ${existing.length}`);

  // We need at least 32 unique players for 16 x 2-player teams
  // Plus 12 for the 6 RR teams = 44 total, but we can reuse players across tournaments
  const needed = 32 - existing.length;
  const newPlayers = [];

  if (needed > 0) {
    console.log(`Creating ${needed} test players...`);
    // Pick names not already used
    const existingNames = new Set(existing.map(p => p.name.toLowerCase()));
    let created = 0;
    for (const name of FIRST_NAMES) {
      if (created >= needed) break;
      if (existingNames.has(name.toLowerCase())) continue;
      const elo = 1100 + Math.floor(Math.random() * 200); // 1100-1300 range
      const r = await query(
        'INSERT INTO players (name, elo_rating) VALUES ($1, $2) RETURNING id, name, elo_rating',
        [name, elo]
      );
      newPlayers.push(r.rows[0]);
      created++;
    }
    console.log(`Created ${created} players`);
  }

  const allPlayers = (await query('SELECT id, name, elo_rating FROM players ORDER BY elo_rating DESC')).rows;
  console.log(`Total players: ${allPlayers.length}`);

  // Get organizer (use first existing player)
  const organizer = existing[0]; // Alice or whoever

  // Get courts
  const courts = (await query('SELECT id, name FROM courts ORDER BY id')).rows;

  // ===========================
  // 1. SINGLE ELIM — 16 TEAMS
  // ===========================
  console.log('\n=== Creating "Spring Showdown" (16-team Single Elim) ===');

  const se = (await query(
    `INSERT INTO tournaments (name, format, team_size, organizer_player_id)
     VALUES ('Spring Showdown', 'single_elimination', 2, $1) RETURNING *`,
    [organizer.id]
  )).rows[0];

  // Add courts
  for (const c of courts) {
    await query('INSERT INTO tournament_courts (tournament_id, court_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [se.id, c.id]);
  }

  // Create 16 teams with 2 players each
  const seTeamIds = [];
  for (let i = 0; i < 16; i++) {
    const team = (await query(
      'INSERT INTO tournament_teams (tournament_id, name, seed) VALUES ($1, $2, $3) RETURNING *',
      [se.id, TEAM_NAMES_16[i], i + 1]
    )).rows[0];
    seTeamIds.push(team.id);

    const p1 = allPlayers[i * 2];
    const p2 = allPlayers[i * 2 + 1];
    await query('INSERT INTO tournament_team_players (team_id, player_id) VALUES ($1, $2)', [team.id, p1.id]);
    await query('INSERT INTO tournament_team_players (team_id, player_id) VALUES ($1, $2)', [team.id, p2.id]);
  }
  console.log(`Created 16 teams`);

  // Generate bracket: 16 teams = 4 rounds (R1: 8 matches, R2: 4, R3: 2, R4: 1 = 15 total)
  // No byes needed since 16 is a power of 2
  const totalRounds = 4;
  const seMatchesByRound = [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create from final to first
    for (let round = totalRounds; round >= 1; round--) {
      const matchesInRound = Math.pow(2, totalRounds - round);
      const roundMatches = [];

      for (let m = 0; m < matchesInRound; m++) {
        const nextMatchId = round < totalRounds
          ? seMatchesByRound[seMatchesByRound.length - 1][Math.floor(m / 2)]
          : null;
        const nextMatchSlot = round < totalRounds ? (m % 2) + 1 : null;

        const r = await client.query(
          `INSERT INTO tournament_matches (tournament_id, round_number, match_number, status, next_match_id, next_match_slot)
           VALUES ($1, $2, $3, 'pending', $4, $5) RETURNING id`,
          [se.id, round, m + 1, nextMatchId, nextMatchSlot]
        );
        roundMatches.push(r.rows[0].id);
      }
      seMatchesByRound.push(roundMatches);
    }

    // R1 matches are the last array (we built final→first)
    const r1Matches = seMatchesByRound[seMatchesByRound.length - 1]; // 8 matches
    const r2Matches = seMatchesByRound[seMatchesByRound.length - 2]; // 4 matches
    const r3Matches = seMatchesByRound[seMatchesByRound.length - 3]; // 2 matches (semis)

    // Standard 16-team seeding: 1v16, 8v9, 4v13, 5v12, 2v15, 7v10, 3v14, 6v11
    const seedMatchups = [[1,16],[8,9],[4,13],[5,12],[2,15],[7,10],[3,14],[6,11]];

    // Assign teams to R1
    for (let i = 0; i < 8; i++) {
      const [s1, s2] = seedMatchups[i];
      await client.query(
        'UPDATE tournament_matches SET team1_id = $1, team2_id = $2, status = $3 WHERE id = $4',
        [seTeamIds[s1 - 1], seTeamIds[s2 - 1], 'completed', r1Matches[i]]
      );
    }

    // Simulate R1 results: higher seed wins (except one upset: seed 9 beats seed 8)
    const r1Winners = [];
    for (let i = 0; i < 8; i++) {
      const [s1, s2] = seedMatchups[i];
      // Upset: in match 2 (8v9), seed 9 wins
      let winnerSeed, winScore, loseScore;
      if (i === 1) {
        winnerSeed = s2; // upset
        winScore = 25;
        loseScore = 23;
      } else {
        winnerSeed = s1; // favorite wins
        winScore = 25;
        loseScore = 15 + Math.floor(Math.random() * 8);
      }
      const winnerId = seTeamIds[winnerSeed - 1];
      r1Winners.push(winnerId);

      await client.query(
        `UPDATE tournament_matches SET score_team1 = $1, score_team2 = $2, winning_team_id = $3 WHERE id = $4`,
        [i === 1 ? loseScore : winScore, i === 1 ? winScore : loseScore, winnerId, r1Matches[i]]
      );
    }
    console.log(`R1 complete: 8 matches played (1 upset: Cobras over Wolves)`);

    // Advance R1 winners to R2
    for (let i = 0; i < 8; i++) {
      const matchData = (await client.query('SELECT * FROM tournament_matches WHERE id = $1', [r1Matches[i]])).rows[0];
      if (matchData.next_match_id) {
        const col = matchData.next_match_slot === 1 ? 'team1_id' : 'team2_id';
        await client.query(`UPDATE tournament_matches SET ${col} = $1 WHERE id = $2`, [r1Winners[i], matchData.next_match_id]);
      }
    }

    // Mark R2 matches as ready (all 4 should have both teams now)
    for (const mid of r2Matches) {
      const m = (await client.query('SELECT * FROM tournament_matches WHERE id = $1', [mid])).rows[0];
      if (m.team1_id && m.team2_id) {
        await client.query('UPDATE tournament_matches SET status = $1 WHERE id = $2', ['ready', mid]);
      }
    }

    // Simulate R2 results (quarters): all higher seeds win
    const r2Winners = [];
    for (let i = 0; i < 4; i++) {
      const m = (await client.query('SELECT * FROM tournament_matches WHERE id = $1', [r2Matches[i]])).rows[0];
      // team1 is always the higher seed from our bracket structure
      const winnerId = m.team1_id;
      r2Winners.push(winnerId);
      const winScore = 25;
      const loseScore = 18 + Math.floor(Math.random() * 5);

      await client.query(
        `UPDATE tournament_matches SET score_team1 = $1, score_team2 = $2, winning_team_id = $3, status = 'completed' WHERE id = $4`,
        [winScore, loseScore, winnerId, r2Matches[i]]
      );

      // Advance to semis
      if (m.next_match_id) {
        const col = m.next_match_slot === 1 ? 'team1_id' : 'team2_id';
        await client.query(`UPDATE tournament_matches SET ${col} = $1 WHERE id = $2`, [winnerId, m.next_match_id]);
      }
    }
    console.log(`R2 (Quarters) complete: 4 matches played`);

    // Mark semis as ready
    for (const mid of r3Matches) {
      const m = (await client.query('SELECT * FROM tournament_matches WHERE id = $1', [mid])).rows[0];
      if (m.team1_id && m.team2_id) {
        await client.query('UPDATE tournament_matches SET status = $1 WHERE id = $2', ['ready', mid]);
      }
    }
    console.log(`Semis are READY — waiting for you to play them`);

    // Set tournament to active
    await client.query('UPDATE tournaments SET status = $1 WHERE id = $2', ['active', se.id]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log(`\nSingle Elim tournament #${se.id} ready!`);
  console.log(`  URL: /tournament/${se.id}`);
  console.log(`  State: R1+R2 done, Semis ready, Final pending`);
  console.log(`  Use Admin > Manage Matches to play through semis + final`);

  // ===========================
  // 2. ROUND ROBIN — 6 TEAMS
  // ===========================
  console.log('\n=== Creating "Round Robin Classic" (6-team RR) ===');

  const rr = (await query(
    `INSERT INTO tournaments (name, format, team_size, organizer_player_id)
     VALUES ('Round Robin Classic', 'round_robin', 2, $1) RETURNING *`,
    [organizer.id]
  )).rows[0];

  for (const c of courts) {
    await query('INSERT INTO tournament_courts (tournament_id, court_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [rr.id, c.id]);
  }

  // Create 6 teams with 2 players each (reuse first 12 players)
  const rrTeamIds = [];
  for (let i = 0; i < 6; i++) {
    const team = (await query(
      'INSERT INTO tournament_teams (tournament_id, name, seed) VALUES ($1, $2, $3) RETURNING *',
      [rr.id, RR_TEAM_NAMES[i], i + 1]
    )).rows[0];
    rrTeamIds.push(team.id);

    const p1 = allPlayers[i * 2];
    const p2 = allPlayers[i * 2 + 1];
    await query('INSERT INTO tournament_team_players (team_id, player_id) VALUES ($1, $2)', [team.id, p1.id]);
    await query('INSERT INTO tournament_team_players (team_id, player_id) VALUES ($1, $2)', [team.id, p2.id]);
  }
  console.log(`Created 6 teams`);

  // Generate round robin: 6 teams → 5 rounds, 3 matches each = 15 matches
  const n = 6;
  const rrTeamList = [...rrTeamIds];
  const rounds = n - 1; // 5 rounds

  const client2 = await pool.connect();
  try {
    await client2.query('BEGIN');

    for (let round = 0; round < rounds; round++) {
      let matchNum = 1;
      for (let i = 0; i < n / 2; i++) {
        const homeIdx = i === 0 ? 0 : ((round + i - 1) % (n - 1)) + 1;
        const awayRaw = n - 1 - i;
        const awayIdx = awayRaw === 0 ? 0 : ((round + awayRaw - 1) % (n - 1)) + 1;

        await client2.query(
          `INSERT INTO tournament_matches (tournament_id, round_number, match_number, team1_id, team2_id, status)
           VALUES ($1, $2, $3, $4, $5, 'ready')`,
          [rr.id, round + 1, matchNum, rrTeamList[homeIdx], rrTeamList[awayIdx]]
        );
        matchNum++;
      }
    }

    await client2.query('UPDATE tournaments SET status = $1 WHERE id = $2', ['active', rr.id]);
    await client2.query('COMMIT');
  } catch (err) {
    await client2.query('ROLLBACK');
    throw err;
  } finally {
    client2.release();
  }

  // Verify
  const rrMatchCount = (await query('SELECT COUNT(*)::int as c FROM tournament_matches WHERE tournament_id = $1', [rr.id])).rows[0].c;

  // Verify all unique matchups
  const rrMatches = (await query('SELECT team1_id, team2_id FROM tournament_matches WHERE tournament_id = $1', [rr.id])).rows;
  const matchupSet = new Set();
  for (const m of rrMatches) {
    matchupSet.add([m.team1_id, m.team2_id].sort().join('-'));
  }

  console.log(`Created ${rrMatchCount} matches (${matchupSet.size} unique matchups, expected 15)`);
  console.log(`\nRound Robin tournament #${rr.id} ready!`);
  console.log(`  URL: /tournament/${rr.id}`);
  console.log(`  State: All 15 matches ready to play`);
  console.log(`  5 rounds × 3 matches — play through and watch standings update`);

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Single Elim: /tournament/${se.id} — play semis + final (admin matches page)`);
  console.log(`Round Robin: /tournament/${rr.id} — play all 15 matches, check standings`);
  console.log(`Total players in system: ${allPlayers.length}`);
};
