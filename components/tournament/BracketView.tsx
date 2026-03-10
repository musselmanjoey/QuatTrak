'use client';

import Link from 'next/link';
import { TournamentMatchWithDetails } from '@/lib/types';

interface Props {
  matches: TournamentMatchWithDetails[];
  tournamentId: string;
}

export default function BracketView({ matches, tournamentId }: Props) {
  // Group by round
  const rounds = new Map<number, TournamentMatchWithDetails[]>();
  for (const m of matches) {
    if (!rounds.has(m.round_number)) rounds.set(m.round_number, []);
    rounds.get(m.round_number)!.push(m);
  }

  const sortedRounds = Array.from(rounds.entries()).sort((a, b) => a[0] - b[0]);
  const totalRounds = sortedRounds.length;

  const roundLabel = (round: number, total: number) => {
    if (round === total) return 'Final';
    if (round === total - 1) return 'Semis';
    if (round === total - 2) return 'Quarters';
    return `Round ${round}`;
  };

  return (
    <div className="bracket-grid" style={{
      display: 'flex',
      gap: '16px',
      overflowX: 'auto',
      paddingBottom: '16px',
      WebkitOverflowScrolling: 'touch',
    }}>
      {sortedRounds.map(([round, roundMatches]) => (
        <div key={round} className="bracket-round" style={{
          minWidth: '200px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--border)',
          }}>
            {roundLabel(round, totalRounds)}
          </div>

          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            gap: '8px',
          }}>
            {roundMatches.map((m) => (
              <Link
                key={m.id}
                href={`/tournament/${tournamentId}/match/${m.id}`}
                className="bracket-match"
                style={{
                  display: 'block',
                  background: 'var(--bg-card)',
                  border: `1px solid ${m.status === 'ready' ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 10px',
                  textDecoration: 'none',
                  color: 'inherit',
                  fontSize: '14px',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  fontWeight: m.winning_team_id === m.team1_id ? 700 : 400,
                  color: m.winning_team_id === m.team1_id ? 'var(--success)' : 'var(--text-primary)',
                }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.team1_name || (m.is_bye && !m.team1_id ? '---' : 'TBD')}
                  </span>
                  <span>{m.score_team1 ?? ''}</span>
                </div>
                <div style={{ borderTop: '1px solid var(--border)' }} />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  fontWeight: m.winning_team_id === m.team2_id ? 700 : 400,
                  color: m.winning_team_id === m.team2_id ? 'var(--success)' : 'var(--text-primary)',
                }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.team2_name || (m.is_bye && !m.team2_id ? '---' : 'TBD')}
                  </span>
                  <span>{m.score_team2 ?? ''}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
