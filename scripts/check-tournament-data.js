module.exports = async ({ pool, query }) => {
  // List tournaments
  const tournaments = (await query('SELECT * FROM tournaments ORDER BY id')).rows;
  console.log('=== Tournaments ===');
  for (const t of tournaments) {
    console.log(`  #${t.id} "${t.name}" — ${t.format} — status: ${t.status}`);
  }

  for (const t of tournaments) {
    console.log(`\n=== Tournament #${t.id}: ${t.name} ===`);

    // Teams
    const teams = (await query(
      `SELECT tt.id, tt.name, tt.seed,
              array_agg(p.name ORDER BY p.name) as players
       FROM tournament_teams tt
       LEFT JOIN tournament_team_players ttp ON ttp.team_id = tt.id
       LEFT JOIN players p ON p.id = ttp.player_id
       WHERE tt.tournament_id = $1
       GROUP BY tt.id, tt.name, tt.seed
       ORDER BY tt.seed NULLS LAST`, [t.id]
    )).rows;
    console.log('\nTeams:');
    for (const tm of teams) {
      console.log(`  Seed ${tm.seed}: ${tm.name} — [${tm.players.join(', ')}]`);
    }

    // Matches
    const matches = (await query(
      `SELECT tm.*,
              t1.name as team1_name, t2.name as team2_name,
              w.name as winner_name
       FROM tournament_matches tm
       LEFT JOIN tournament_teams t1 ON t1.id = tm.team1_id
       LEFT JOIN tournament_teams t2 ON t2.id = tm.team2_id
       LEFT JOIN tournament_teams w ON w.id = tm.winning_team_id
       WHERE tm.tournament_id = $1
       ORDER BY tm.round_number, tm.match_number`, [t.id]
    )).rows;
    console.log('\nMatches:');
    for (const m of matches) {
      const bye = m.is_bye ? ' [BYE]' : '';
      const score = m.score_team1 !== null ? `${m.score_team1}-${m.score_team2}` : 'no score';
      console.log(`  R${m.round_number} M${m.match_number}: ${m.team1_name || 'TBD'} vs ${m.team2_name || 'TBD'} — ${score} — winner: ${m.winner_name || 'none'} — ${m.status}${bye}`);
    }

    // Elo snapshots
    const eloSnaps = (await query(
      `SELECT tmp.*, p.name as player_name
       FROM tournament_match_players tmp
       JOIN players p ON p.id = tmp.player_id
       JOIN tournament_matches tm ON tm.id = tmp.tournament_match_id
       WHERE tm.tournament_id = $1
       ORDER BY tmp.tournament_match_id, tmp.team_id, p.name`, [t.id]
    )).rows;
    if (eloSnaps.length > 0) {
      console.log('\nElo Changes:');
      for (const e of eloSnaps) {
        const diff = e.elo_after ? e.elo_after - e.elo_before : 0;
        const sign = diff >= 0 ? '+' : '';
        console.log(`  Match ${e.tournament_match_id}: ${e.player_name} — ${e.elo_before} → ${e.elo_after} (${sign}${diff})`);
      }
    } else {
      console.log('\nNo Elo snapshots recorded.');
    }
  }

  // Current player Elos
  console.log('\n=== Current Player Elos ===');
  const players = (await query('SELECT id, name, elo_rating, wins, losses FROM players ORDER BY elo_rating DESC')).rows;
  for (const p of players) {
    console.log(`  ${p.name}: ${p.elo_rating} (${p.wins}W-${p.losses}L)`);
  }
};
