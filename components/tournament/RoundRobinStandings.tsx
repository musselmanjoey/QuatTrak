'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TournamentMatchWithDetails, TournamentStandingsEntry } from '@/lib/types';

interface Props {
  tournamentId: string;
  matches: TournamentMatchWithDetails[];
}

export default function RoundRobinStandings({ tournamentId, matches }: Props) {
  const [standings, setStandings] = useState<TournamentStandingsEntry[]>([]);
  const [view, setView] = useState<'standings' | 'matches'>('standings');

  useEffect(() => {
    fetch(`/api/tournaments/${tournamentId}/standings`)
      .then(r => r.json())
      .then(setStandings)
      .catch(() => {});
  }, [tournamentId]);

  const byRound = matches.reduce((acc, m) => {
    if (!acc[m.round_number]) acc[m.round_number] = [];
    acc[m.round_number].push(m);
    return acc;
  }, {} as Record<number, TournamentMatchWithDetails[]>);

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          className={`btn btn-sm ${view === 'standings' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => setView('standings')}
        >
          Standings
        </button>
        <button
          className={`btn btn-sm ${view === 'matches' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => setView('matches')}
        >
          Matches
        </button>
      </div>

      {view === 'standings' && (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>W</th>
              <th>L</th>
              <th>+/-</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.team_id} className={i < 3 ? `rank-${i + 1}` : ''}>
                <td><span className="rank-num">{i + 1}</span></td>
                <td style={{ fontWeight: 600 }}>{s.team_name}</td>
                <td>{s.wins}</td>
                <td>{s.losses}</td>
                <td style={{ color: s.point_differential > 0 ? 'var(--success)' : s.point_differential < 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                  {s.point_differential > 0 ? '+' : ''}{s.point_differential}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view === 'matches' && (
        <div>
          {Object.entries(byRound).map(([round, roundMatches]) => (
            <div key={round} style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '8px' }}>Round {round}</h3>
              {roundMatches.map((m) => (
                <Link
                  key={m.id}
                  href={`/tournament/${tournamentId}/match/${m.id}`}
                  className={`match-card ${m.status === 'completed' ? 'completed' : ''}`}
                  style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="match-teams" style={{ marginBottom: '0' }}>
                    <div className={`match-team ${m.winning_team_id === m.team1_id ? 'winner' : ''}`}>
                      <div className="team-label team1">{m.team1_name}</div>
                      {m.score_team1 !== null && <div style={{ fontSize: '20px', fontWeight: 700 }}>{m.score_team1}</div>}
                    </div>
                    <div className="match-vs">VS</div>
                    <div className={`match-team ${m.winning_team_id === m.team2_id ? 'winner' : ''}`}>
                      <div className="team-label team2">{m.team2_name}</div>
                      {m.score_team2 !== null && <div style={{ fontSize: '20px', fontWeight: 700 }}>{m.score_team2}</div>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
