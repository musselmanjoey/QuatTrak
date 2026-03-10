'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import TeamManager from '@/components/tournament/TeamManager';
import { TournamentTeamWithPlayers } from '@/lib/types';

export default function ManageTeamsPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [teams, setTeams] = useState<TournamentTeamWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/teams`);
      setTeams(await res.json());
    } catch {
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleAutoSeed = async () => {
    try {
      // Auto-seed is done as part of generate, but we can trigger it manually
      // by re-fetching after a generate call. For now just re-fetch.
      await fetchTeams();
    } catch {
      setError('Failed to auto-seed');
    }
  };

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
        <h1>Teams</h1>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-dim)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <TeamManager
        tournamentId={tournamentId}
        teams={teams}
        onTeamsChanged={fetchTeams}
      />
    </div>
  );
}
