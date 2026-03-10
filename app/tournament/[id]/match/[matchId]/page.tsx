'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { TournamentMatchWithDetails } from '@/lib/types';
import ScoreReporter from '@/components/tournament/ScoreReporter';
import MatchDetail from '@/components/tournament/MatchDetail';

export default function TournamentMatchPage() {
  const params = useParams();
  const tournamentId = params.id as string;
  const matchId = params.matchId as string;

  const [match, setMatch] = useState<TournamentMatchWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}`);
      if (res.ok) setMatch(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [tournamentId, matchId]);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  if (loading) {
    return (
      <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="screen">
        <p className="text-muted text-center mt-6">Match not found</p>
      </div>
    );
  }

  const playerId = typeof window !== 'undefined'
    ? localStorage.getItem(`tournament_${tournamentId}_player_id`)
    : null;

  return (
    <div className="screen">
      <h1 style={{ marginBottom: '4px' }}>Match Detail</h1>
      <p className="text-muted text-sm" style={{ marginBottom: '20px' }}>
        Round {match.round_number} | Match {match.match_number}
      </p>

      <MatchDetail match={match} />

      {(match.status === 'ready' || match.status === 'in_progress') && (
        <div style={{ marginTop: '24px' }}>
          <ScoreReporter
            tournamentId={tournamentId}
            matchId={match.id}
            team1Name={match.team1_name || 'Team 1'}
            team2Name={match.team2_name || 'Team 2'}
            playerId={playerId ? parseInt(playerId) : null}
            onScoreReported={fetchMatch}
          />
        </div>
      )}
    </div>
  );
}
