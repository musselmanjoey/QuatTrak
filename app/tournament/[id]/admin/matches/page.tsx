'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import CourtAssigner from '@/components/tournament/CourtAssigner';
import { TournamentMatchWithDetails } from '@/lib/types';

function MatchScoreForm({
  tournamentId,
  match,
  isOverride,
  onSubmitted,
  onError,
}: {
  tournamentId: string;
  match: TournamentMatchWithDetails;
  isOverride: boolean;
  onSubmitted: () => void;
  onError: (msg: string) => void;
}) {
  const [s1, setS1] = useState(match.score_team1 !== null ? String(match.score_team1) : '');
  const [s2, setS2] = useState(match.score_team2 !== null ? String(match.score_team2) : '');
  const [submitting, setSubmitting] = useState(false);

  const score1 = parseInt(s1);
  const score2 = parseInt(s2);
  const valid = !isNaN(score1) && !isNaN(score2) && score1 !== score2 && score1 >= 0 && score2 >= 0;

  const submit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score_team1: score1,
          score_team2: score2,
          is_override: isOverride,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      onSubmitted();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
      <input
        className="input"
        type="number"
        min="0"
        placeholder="0"
        value={s1}
        onChange={(e) => setS1(e.target.value)}
        style={{ flex: 1, textAlign: 'center', fontSize: '20px', fontWeight: 700, minHeight: '44px', padding: '8px' }}
      />
      <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>-</span>
      <input
        className="input"
        type="number"
        min="0"
        placeholder="0"
        value={s2}
        onChange={(e) => setS2(e.target.value)}
        style={{ flex: 1, textAlign: 'center', fontSize: '20px', fontWeight: 700, minHeight: '44px', padding: '8px' }}
      />
      <button
        className="btn btn-primary btn-sm"
        disabled={!valid || submitting}
        onClick={submit}
        style={{ minWidth: '70px' }}
      >
        {submitting ? '...' : isOverride ? 'Fix' : 'Save'}
      </button>
    </div>
  );
}

export default function ManageMatchesPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [matches, setMatches] = useState<TournamentMatchWithDetails[]>([]);
  const [courts, setCourts] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overridingId, setOverridingId] = useState<number | null>(null);

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

  const handleSubmitted = () => {
    setOverridingId(null);
    setError('');
    fetchData();
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

              {/* Score input for ready/in_progress matches */}
              {(match.status === 'ready' || match.status === 'in_progress') && match.team1_id && match.team2_id && (
                <MatchScoreForm
                  tournamentId={tournamentId}
                  match={match}
                  isOverride={false}
                  onSubmitted={handleSubmitted}
                  onError={setError}
                />
              )}

              {/* Override for completed matches */}
              {match.status === 'completed' && !match.is_bye && overridingId === match.id && (
                <MatchScoreForm
                  tournamentId={tournamentId}
                  match={match}
                  isOverride={true}
                  onSubmitted={handleSubmitted}
                  onError={setError}
                />
              )}

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
                {match.status === 'completed' && !match.is_bye && overridingId !== match.id && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setOverridingId(match.id)}
                  >
                    Override Score
                  </button>
                )}
                {match.status === 'completed' && overridingId === match.id && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setOverridingId(null)}
                  >
                    Cancel
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
