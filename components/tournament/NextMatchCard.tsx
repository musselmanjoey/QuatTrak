'use client';

import Link from 'next/link';
import { TournamentMatchWithDetails } from '@/lib/types';

interface Props {
  match: TournamentMatchWithDetails;
  tournamentId: string;
}

export default function NextMatchCard({ match, tournamentId }: Props) {
  return (
    <Link
      href={`/tournament/${tournamentId}/match/${match.id}`}
      className="next-match-card"
      style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span className="badge badge-active">{match.status === 'in_progress' ? 'In Progress' : 'Ready'}</span>
        <span className="text-sm text-muted">Round {match.round_number}</span>
      </div>

      <div className="match-teams" style={{ marginBottom: '12px' }}>
        <div className="match-team">
          <div className="team-label team1">{match.team1_name || 'TBD'}</div>
          <div className="text-sm text-muted">
            {match.team1_players.map(p => p.name).join(', ')}
          </div>
        </div>
        <div className="match-vs">VS</div>
        <div className="match-team">
          <div className="team-label team2">{match.team2_name || 'TBD'}</div>
          <div className="text-sm text-muted">
            {match.team2_players.map(p => p.name).join(', ')}
          </div>
        </div>
      </div>

      {match.court_name && (
        <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--accent)', fontWeight: 600 }}>
          Court: {match.court_name}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '12px' }}>
        <span className="btn btn-primary btn-sm">Report Score</span>
      </div>
    </Link>
  );
}
