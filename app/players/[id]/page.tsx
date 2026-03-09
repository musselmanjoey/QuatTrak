'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface MatchHistoryEntry {
  match_id: number;
  date: string;
  round_number: number;
  team: number;
  winning_team: number;
  won: boolean;
  teammates: string[];
  opponents: string[];
  elo_before: number;
  elo_after: number | null;
}

interface PlayerProfile {
  id: number;
  name: string;
  elo_rating: number;
  wins: number;
  losses: number;
  games_played: number;
  win_rate: number;
  match_history: MatchHistoryEntry[];
}

export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlayer() {
      try {
        const res = await fetch(`/api/players/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setPlayer(data);
        }
      } catch {
        console.error('Failed to fetch player');
      } finally {
        setLoading(false);
      }
    }
    fetchPlayer();
  }, [params.id]);

  if (loading) {
    return (
      <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="screen">
        <p className="text-muted">Player not found.</p>
        <button className="btn btn-secondary mt-4" onClick={() => router.back()}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="screen">
      <button
        className="btn btn-secondary btn-sm mb-4"
        onClick={() => router.back()}
      >
        &larr; Back
      </button>

      <h1 className="mb-4">{player.name}</h1>

      <div className="stat-grid">
        <div className="stat-box">
          <div className="stat-value">{player.elo_rating}</div>
          <div className="stat-label">Elo</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{player.wins}-{player.losses}</div>
          <div className="stat-label">W-L</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{player.win_rate}%</div>
          <div className="stat-label">Win Rate</div>
        </div>
      </div>

      <h2 className="mb-4">Match History</h2>

      {player.match_history.length > 0 ? (
        <div className="flex flex-col gap-3">
          {player.match_history.map((match) => {
            const eloChange = match.elo_after !== null ? match.elo_after - match.elo_before : null;
            return (
              <div key={match.match_id} className="card">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <span style={{ fontWeight: 600 }}>
                      {new Date(match.date + 'T12:00:00').toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="text-muted text-sm"> &middot; Game {match.round_number}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {match.won ? (
                      <span className="badge badge-active">WIN</span>
                    ) : (
                      <span className="badge badge-sitting">LOSS</span>
                    )}
                    {eloChange !== null && (
                      <span className={`elo-change ${eloChange >= 0 ? 'positive' : 'negative'}`}>
                        {eloChange >= 0 ? '+' : ''}{eloChange}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm">
                  <div>
                    <span className="text-muted">With: </span>
                    {match.teammates.length > 0 ? match.teammates.join(', ') : 'Solo'}
                  </div>
                  <div>
                    <span className="text-muted">Vs: </span>
                    {match.opponents.join(', ')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted">No matches played yet.</p>
      )}
    </div>
  );
}
