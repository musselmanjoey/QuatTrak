'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { TournamentWithDetails } from '@/lib/types';

export default function TournamentListPage() {
  const [tournaments, setTournaments] = useState<TournamentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTournaments = useCallback(async () => {
    try {
      const res = await fetch('/api/tournaments');
      const data = await res.json();
      setTournaments(data);
    } catch {
      setError('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  if (loading) {
    return (
      <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  const statusLabel = (status: string) => {
    if (status === 'setup') return 'badge-setup';
    if (status === 'active') return 'badge-active';
    return 'badge-completed';
  };

  return (
    <div className="screen">
      <div className="section-header mb-4">
        <h1>Tournaments</h1>
        <Link href="/tournament/new" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
          + Create
        </Link>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-dim)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {tournaments.length === 0 && (
        <p className="text-muted text-center mt-6">No tournaments yet.</p>
      )}

      {tournaments.map((t) => (
        <Link
          key={t.id}
          href={`/tournament/${t.id}`}
          className="match-card"
          style={{ display: 'block', textDecoration: 'none', color: 'inherit', marginBottom: '16px' }}
        >
          <div className="section-header" style={{ marginBottom: '8px' }}>
            <h3 style={{ margin: 0 }}>{t.name}</h3>
            <span className={`badge ${statusLabel(t.status)}`}>
              {t.status}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <span>{t.format === 'single_elimination' ? 'Single Elim' : 'Round Robin'}</span>
            <span>{t.team_count} teams</span>
            <span>{t.completed_match_count}/{t.match_count} matches</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Organized by {t.organizer_name}
          </div>
        </Link>
      ))}
    </div>
  );
}
