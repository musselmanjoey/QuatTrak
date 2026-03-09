'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface CourtPlayer {
  player_id: number;
  name: string;
  elo_rating: number;
  is_active: boolean;
}

interface CourtOverview {
  id: number;
  name: string;
  slug: string;
  session_id: number | null;
  checked_in_count: number;
  active_count: number;
  players: CourtPlayer[];
}

export default function MobileDashboard() {
  const [courts, setCourts] = useState<CourtOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/courts/overview');
      const data = await res.json();
      setCourts(data);
    } catch {
      setError('Failed to load courts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

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
        <h1>Courts</h1>
        <p className="text-muted text-sm">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-dim)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {courts.length === 0 && (
        <p className="text-muted text-center mt-6">No courts set up yet.</p>
      )}

      {courts.map((court) => (
        <div key={court.id} className="match-card" style={{ marginBottom: '16px' }}>
          <div className="section-header mb-4">
            <h2 style={{ margin: 0 }}>{court.name}</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {court.checked_in_count > 0 && (
                <span className="badge badge-active">{court.active_count} Active</span>
              )}
              <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                {court.checked_in_count} Checked In
              </span>
            </div>
          </div>

          {court.players.length > 0 ? (
            <div className="player-grid" style={{ marginBottom: '0' }}>
              {court.players.map((p) => (
                <Link
                  key={p.player_id}
                  href={`/players/${p.player_id}`}
                  className={`player-tile ${p.is_active ? 'active' : 'sitting'}`}
                  style={{ textDecoration: 'none' }}
                >
                  <span className="name">{p.name}</span>
                  <span className="elo">{p.elo_rating} Elo</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted text-center">No one checked in yet</p>
          )}
        </div>
      ))}
    </div>
  );
}
