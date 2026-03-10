'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { TournamentWithDetails } from '@/lib/types';

export default function TODashboardPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<TournamentWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [starting, setStarting] = useState(false);

  const fetchTournament = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`);
      if (!res.ok) throw new Error();
      setTournament(await res.json());
    } catch {
      setError('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/generate`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      await fetchTournament();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    setError('');
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/start`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      await fetchTournament();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  };

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

  const progress = tournament.match_count > 0
    ? Math.round((tournament.completed_match_count / tournament.match_count) * 100)
    : 0;

  return (
    <div className="screen">
      <div className="section-header mb-4">
        <h1>{tournament.name}</h1>
        <span className={`badge ${tournament.status === 'setup' ? 'badge-setup' : tournament.status === 'active' ? 'badge-active' : 'badge-completed'}`}>
          {tournament.status}
        </span>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-dim)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className="stat-grid" style={{ marginBottom: '16px' }}>
        <div className="stat-box">
          <div className="stat-value">{tournament.team_count}</div>
          <div className="stat-label">Teams</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{tournament.match_count}</div>
          <div className="stat-label">Matches</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{progress}%</div>
          <div className="stat-label">Complete</div>
        </div>
      </div>

      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        <span>{tournament.format === 'single_elimination' ? 'Single Elimination' : 'Round Robin'}</span>
        <span style={{ margin: '0 8px' }}>|</span>
        <span>{tournament.team_size}v{tournament.team_size}</span>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href={`/tournament/${tournamentId}/admin/teams`}
          className="btn btn-secondary btn-full"
          style={{ textDecoration: 'none' }}
        >
          Manage Teams ({tournament.team_count})
        </Link>

        {tournament.status === 'setup' && (
          <>
            <button
              className="btn btn-secondary btn-full"
              onClick={handleGenerate}
              disabled={generating || tournament.team_count < 2}
            >
              {generating ? 'Generating...' : tournament.match_count > 0 ? 'Re-Generate Bracket' : 'Generate Bracket'}
            </button>

            {tournament.match_count > 0 && (
              <button
                className="btn btn-primary btn-full"
                onClick={handleStart}
                disabled={starting}
              >
                {starting ? 'Starting...' : 'Start Tournament'}
              </button>
            )}
          </>
        )}

        {(tournament.status === 'active' || tournament.status === 'completed') && (
          <>
            <Link
              href={`/tournament/${tournamentId}/admin/matches`}
              className="btn btn-secondary btn-full"
              style={{ textDecoration: 'none' }}
            >
              Manage Matches
            </Link>
            <Link
              href={`/tournament/${tournamentId}`}
              className="btn btn-secondary btn-full"
              style={{ textDecoration: 'none' }}
            >
              View Bracket
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
