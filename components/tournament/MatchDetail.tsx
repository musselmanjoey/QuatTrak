'use client';

import { TournamentMatchWithDetails } from '@/lib/types';

interface Props {
  match: TournamentMatchWithDetails;
}

export default function MatchDetail({ match }: Props) {
  return (
    <div className="card">
      <div className="match-teams">
        <div className={`match-team ${match.winning_team_id === match.team1_id ? 'winner' : ''}`}>
          <div className="team-label team1">{match.team1_name || 'TBD'}</div>
          {match.score_team1 !== null && (
            <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>{match.score_team1}</div>
          )}
          {match.team1_players.map((p) => (
            <div key={p.id} className="team-player">{p.name}</div>
          ))}
        </div>
        <div className="match-vs">VS</div>
        <div className={`match-team ${match.winning_team_id === match.team2_id ? 'winner' : ''}`}>
          <div className="team-label team2">{match.team2_name || 'TBD'}</div>
          {match.score_team2 !== null && (
            <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>{match.score_team2}</div>
          )}
          {match.team2_players.map((p) => (
            <div key={p.id} className="team-player">{p.name}</div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <span className={`badge ${match.status === 'completed' ? 'badge-completed' : match.status === 'ready' ? 'badge-active' : 'badge-setup'}`}>
          {match.status}
        </span>
        {match.court_name && (
          <span className="badge" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            {match.court_name}
          </span>
        )}
        {match.is_bye && (
          <span className="badge" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
            BYE
          </span>
        )}
      </div>
    </div>
  );
}
