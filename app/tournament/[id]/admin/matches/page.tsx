'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import CourtAssigner from '@/components/tournament/CourtAssigner';
import { TournamentMatchWithDetails } from '@/lib/types';

export default function ManageMatchesPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [matches, setMatches] = useState<TournamentMatchWithDetails[]>([]);
  const [courts, setCourts] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [matchesRes, courtsRes] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}/matches`),
        fetch(`/api/tournaments/${tournamentId}/courts`),
      ]);
      setMatches(await matchesRes.json());
      setCourts(await courtsRes.json());
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOverrideScore = async (matchId: number) => {
    const score1 = prompt('Score for Team 1:');
    const score2 = prompt('Score for Team 2:');
    if (!score1 || !score2) return;

    const s1 = parseInt(score1);
    const s2 = parseInt(score2);
    if (isNaN(s1) || isNaN(s2) || s1 === s2) {
      alert('Invalid scores. Must be different numbers.');
      return;
    }

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score_team1: s1, score_team2: s2, is_override: true }),
      });
      if (!res.ok) throw new Error();
      await fetchData();
    } catch {
      setError('Failed to override score');
    }
  };

  if (loading) {
    return (
      <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  const byRound = matches.reduce((acc, m) => {
    if (!acc[m.round_number]) acc[m.round_number] = [];
    acc[m.round_number].push(m);
    return acc;
  }, {} as Record<number, TournamentMatchWithDetails[]>);

  return (
    <div className="screen">
      <h1 style={{ marginBottom: '20px' }}>Manage Matches</h1>

      {error && (
        <div style={{ background: 'var(--danger-dim)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {Object.entries(byRound).map(([round, roundMatches]) => (
        <div key={round} style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '12px' }}>Round {round}</h2>
          {roundMatches.map((match) => (
            <div key={match.id} className={`match-card ${match.status === 'completed' ? 'completed' : ''}`}>
              <div className="match-teams">
                <div className={`match-team ${match.winning_team_id === match.team1_id ? 'winner' : ''}`}>
                  <div className="team-label team1">{match.team1_name || 'TBD'}</div>
                  {match.score_team1 !== null && (
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{match.score_team1}</div>
                  )}
                </div>
                <div className="match-vs">VS</div>
                <div className={`match-team ${match.winning_team_id === match.team2_id ? 'winner' : ''}`}>
                  <div className="team-label team2">{match.team2_name || 'TBD'}</div>
                  {match.score_team2 !== null && (
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{match.score_team2}</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`badge ${match.status === 'completed' ? 'badge-completed' : match.status === 'ready' ? 'badge-active' : 'badge-setup'}`}>
                  {match.status}
                </span>
                {match.court_name && (
                  <span className="text-sm text-muted">{match.court_name}</span>
                )}
                {match.is_bye && (
                  <span className="text-sm text-muted">BYE</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                {(match.status === 'ready' || match.status === 'in_progress') && courts.length > 0 && (
                  <CourtAssigner
                    tournamentId={tournamentId}
                    matchId={match.id}
                    courts={courts}
                    currentCourtId={match.court_id}
                    onAssigned={fetchData}
                  />
                )}
                {match.status === 'completed' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOverrideScore(match.id)}
                  >
                    Override Score
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
