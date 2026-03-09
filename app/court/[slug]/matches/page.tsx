'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import ManualTeamPicker from '@/components/matches/ManualTeamPicker';

interface MatchPlayer {
  id: number;
  match_id: number;
  player_id: number;
  team: number;
  elo_before: number;
  elo_after: number | null;
  player_name: string;
}

interface Match {
  id: number;
  session_id: number;
  round_number: number;
  status: string;
  winning_team: number | null;
  players: MatchPlayer[];
}

interface Session {
  id: number;
  date: string;
  status: string;
  players: { player_id: number; is_active: boolean; name: string; elo_rating: number }[];
}

export default function CourtMatchesPage() {
  const { slug } = useParams<{ slug: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [teamSize, setTeamSize] = useState(2);

  const fetchAll = useCallback(async () => {
    try {
      const sessionRes = await fetch(`/api/courts/${slug}/session`);
      if (!sessionRes.ok) {
        setError('Court not found');
        return;
      }
      const sessionData: Session = await sessionRes.json();
      setSession(sessionData);

      if (sessionData.id) {
        const matchesRes = await fetch(`/api/matches?session_id=${sessionData.id}`);
        if (matchesRes.ok) {
          const matchesData: Match[] = await matchesRes.json();
          setMatches(matchesData);
          if (matchesData.length > 0) {
            setSelectedRound((prev) => {
              if (prev === null) {
                return Math.max(...matchesData.map((m) => m.round_number));
              }
              return prev;
            });
          }
        }
      }
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const rounds = [...new Set(matches.map((m) => m.round_number))].sort((a, b) => a - b);
  const currentRoundMatches = matches.filter((m) => m.round_number === selectedRound);
  const allCurrentRoundCompleted = currentRoundMatches.length > 0 && currentRoundMatches.every((m) => m.status === 'completed');

  async function handleRecordWinner(matchId: number, winningTeam: 1 | 2) {
    setError('');
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winning_team: winningTeam }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to record result');
        return;
      }
      await fetchAll();
    } catch {
      setError('Failed to record result');
    }
  }

  async function handleGenerateNextRound() {
    if (!session) return;
    setError('');
    try {
      const res = await fetch(`/api/sessions/${session.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_size: teamSize, mode: 'auto' }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to generate matches');
        return;
      }
      setSelectedRound(null);
      await fetchAll();
    } catch {
      setError('Failed to generate matches');
    }
  }

  if (loading) {
    return (
      <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  const activePlayers = session?.players.filter((p) => p.is_active) || [];

  return (
    <div className="screen">
      <div className="section-header mb-4">
        <h1>Matches</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowManualPicker(true)}>
            Manual Pick
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-dim)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {rounds.length > 0 && (
        <div className="round-tabs">
          {rounds.map((round) => (
            <button
              key={round}
              className={`round-tab ${selectedRound === round ? 'active' : ''}`}
              onClick={() => setSelectedRound(round)}
            >
              Round {round}
            </button>
          ))}
        </div>
      )}

      {currentRoundMatches.length > 0 ? (
        currentRoundMatches.map((match) => {
          const team1 = match.players.filter((p) => p.team === 1);
          const team2 = match.players.filter((p) => p.team === 2);
          const isCompleted = match.status === 'completed';

          return (
            <div key={match.id} className={`match-card ${isCompleted ? 'completed' : ''}`}>
              <div className="match-teams">
                <div className={`match-team ${isCompleted && match.winning_team === 1 ? 'winner' : ''}`}>
                  <div className="team-label team1">Team 1</div>
                  {team1.map((p) => (
                    <div key={p.id} className="team-player">
                      {p.player_name}
                      {isCompleted && p.elo_after !== null && (
                        <span className={`elo-change ${p.elo_after - p.elo_before >= 0 ? 'positive' : 'negative'}`}>
                          {' '}({p.elo_after - p.elo_before >= 0 ? '+' : ''}{p.elo_after - p.elo_before})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="match-vs">VS</div>
                <div className={`match-team ${isCompleted && match.winning_team === 2 ? 'winner' : ''}`}>
                  <div className="team-label team2">Team 2</div>
                  {team2.map((p) => (
                    <div key={p.id} className="team-player">
                      {p.player_name}
                      {isCompleted && p.elo_after !== null && (
                        <span className={`elo-change ${p.elo_after - p.elo_before >= 0 ? 'positive' : 'negative'}`}>
                          {' '}({p.elo_after - p.elo_before >= 0 ? '+' : ''}{p.elo_after - p.elo_before})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {!isCompleted && (
                <div className="match-actions">
                  <button className="btn btn-team1" onClick={() => handleRecordWinner(match.id, 1)}>
                    Team 1 Wins
                  </button>
                  <button className="btn btn-team2" onClick={() => handleRecordWinner(match.id, 2)}>
                    Team 2 Wins
                  </button>
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="text-center mt-6">
          <p className="text-muted">No matches yet. Generate from the Check In screen or use Manual Pick.</p>
        </div>
      )}

      {allCurrentRoundCompleted && (
        <div className="mt-4" style={{ display: 'flex', gap: '12px' }}>
          <div className="mb-4" style={{ display: 'flex', gap: '8px', flex: 1 }}>
            {[2, 3, 4].map((size) => (
              <button
                key={size}
                className={`btn btn-sm ${teamSize === size ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTeamSize(size)}
              >
                {size}v{size}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleGenerateNextRound}>
            Generate Next Round
          </button>
        </div>
      )}

      {showManualPicker && session && (
        <ManualTeamPicker
          activePlayers={activePlayers}
          sessionId={session.id}
          onClose={() => setShowManualPicker(false)}
          onCreated={() => {
            setShowManualPicker(false);
            setSelectedRound(null);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}
