'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { TournamentWithDetails, TournamentMatchWithDetails } from '@/lib/types';
import BracketView from '@/components/tournament/BracketView';
import RoundRobinStandings from '@/components/tournament/RoundRobinStandings';

export default function TournamentBracketPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<TournamentWithDetails | null>(null);
  const [matches, setMatches] = useState<TournamentMatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [tRes, mRes] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}`),
        fetch(`/api/tournaments/${tournamentId}/matches`),
      ]);
      setTournament(await tRes.json());
      setMatches(await mRes.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="screen">
        <p className="text-muted text-center mt-6">Tournament not found</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="section-header mb-4">
        <h1>{tournament.name}</h1>
        <span className={`badge ${tournament.status === 'setup' ? 'badge-setup' : tournament.status === 'active' ? 'badge-active' : 'badge-completed'}`}>
          {tournament.status}
        </span>
      </div>

      {tournament.status === 'setup' && matches.length === 0 && (
        <p className="text-muted text-center mt-6">Bracket not generated yet.</p>
      )}

      {tournament.format === 'single_elimination' && matches.length > 0 && (
        <BracketView matches={matches} tournamentId={tournamentId} />
      )}

      {tournament.format === 'round_robin' && (
        <RoundRobinStandings tournamentId={tournamentId} matches={matches} />
      )}
    </div>
  );
}
