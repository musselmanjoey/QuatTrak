'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { TournamentMatchWithDetails } from '@/lib/types';
import NextMatchCard from '@/components/tournament/NextMatchCard';

export default function MyMatchesPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const [matches, setMatches] = useState<TournamentMatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerId, setPlayerId] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`tournament_${tournamentId}_player_id`);
    if (!stored) {
      router.push(`/tournament/${tournamentId}/join`);
      return;
    }
    setPlayerId(parseInt(stored));
  }, [tournamentId, router]);

  const fetchMatches = useCallback(async () => {
    if (!playerId) return;
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/my-matches?player_id=${playerId}`);
      setMatches(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [tournamentId, playerId]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  if (loading || !playerId) {
    return (
      <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  const nextMatch = matches.find(m => m.status === 'ready' || m.status === 'in_progress');
  const pastMatches = matches.filter(m => m.status === 'completed');
  const upcomingMatches = matches.filter(m => m.status === 'pending');

  return (
    <div className="screen">
      <h1 style={{ marginBottom: '20px' }}>My Matches</h1>

      {nextMatch && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '12px' }}>Next Up</h2>
          <NextMatchCard match={nextMatch} tournamentId={tournamentId} />
        </div>
      )}

      {upcomingMatches.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '12px' }}>Upcoming</h2>
          {upcomingMatches.map((m) => (
            <div key={m.id} className="match-card">
              <div className="match-teams">
                <div className="match-team">
                  <div className="team-label team1">{m.team1_name || 'TBD'}</div>
                </div>
                <div className="match-vs">VS</div>
                <div className="match-team">
                  <div className="team-label team2">{m.team2_name || 'TBD'}</div>
                </div>
              </div>
              <span className="badge badge-setup">Round {m.round_number}</span>
            </div>
          ))}
        </div>
      )}

      {pastMatches.length > 0 && (
        <div>
          <h2 style={{ marginBottom: '12px' }}>Results</h2>
          {pastMatches.map((m) => (
            <Link
              key={m.id}
              href={`/tournament/${tournamentId}/match/${m.id}`}
              className="match-card"
              style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
            >
              <div className="match-teams">
                <div className={`match-team ${m.winning_team_id === m.team1_id ? 'winner' : ''}`}>
                  <div className="team-label team1">{m.team1_name}</div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{m.score_team1}</div>
                </div>
                <div className="match-vs">VS</div>
                <div className={`match-team ${m.winning_team_id === m.team2_id ? 'winner' : ''}`}>
                  <div className="team-label team2">{m.team2_name}</div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{m.score_team2}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {matches.length === 0 && (
        <p className="text-muted text-center mt-6">No matches found for you in this tournament.</p>
      )}
    </div>
  );
}
