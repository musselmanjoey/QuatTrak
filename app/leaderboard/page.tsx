'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface LeaderboardEntry {
  id: number;
  name: string;
  elo_rating: number;
  wins: number;
  losses: number;
  games_played: number;
  win_rate: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [minGames, setMinGames] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch(`/api/leaderboard?min_games=${minGames}`);
        const data = await res.json();
        setPlayers(data);
      } catch {
        console.error('Failed to fetch leaderboard');
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [minGames]);

  if (loading) {
    return (
      <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="section-header mb-4">
        <h1>Leaderboard</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn btn-sm ${minGames === 0 ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMinGames(0)}
          >
            All
          </button>
          <button
            className={`btn btn-sm ${minGames === 3 ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMinGames(3)}
          >
            3+ Games
          </button>
          <button
            className={`btn btn-sm ${minGames === 5 ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMinGames(5)}
          >
            5+ Games
          </button>
        </div>
      </div>

      {players.length > 0 ? (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Elo</th>
              <th>W-L</th>
              <th>Win%</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => {
              const rank = index + 1;
              let rankClass = '';
              if (rank === 1) rankClass = 'rank-1';
              else if (rank === 2) rankClass = 'rank-2';
              else if (rank === 3) rankClass = 'rank-3';

              return (
                <tr
                  key={player.id}
                  className={rankClass}
                  onClick={() => router.push(`/players/${player.id}`)}
                >
                  <td><span className="rank-num">{rank}</span></td>
                  <td style={{ fontWeight: 600 }}>{player.name}</td>
                  <td>{player.elo_rating}</td>
                  <td>{player.wins}-{player.losses}</td>
                  <td>{player.win_rate}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="text-center mt-6">
          <p className="text-muted">No players yet. Check in and play some matches!</p>
        </div>
      )}
    </div>
  );
}
