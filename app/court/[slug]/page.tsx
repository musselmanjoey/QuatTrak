'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface CheckedInPlayer {
  id: number;
  player_id: number;
  is_active: boolean;
  checked_in_at: string;
  name: string;
  elo_rating: number;
  wins: number;
  losses: number;
}

interface Session {
  id: number;
  date: string;
  status: string;
  players: CheckedInPlayer[];
}

interface Player {
  id: number;
  name: string;
  elo_rating: number;
  wins: number;
  losses: number;
}

export default function CourtCheckInPage() {
  const { slug } = useParams<{ slug: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [teamSize, setTeamSize] = useState(2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/courts/${slug}/session`);
      if (!res.ok) {
        setError('Court not found');
        return;
      }
      const data = await res.json();
      setSession(data);
    } catch {
      setError('Failed to load session');
    }
  }, [slug]);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch('/api/players');
      const data = await res.json();
      setAllPlayers(data);
    } catch {
      setError('Failed to load players');
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchSession(), fetchPlayers()]).then(() => setLoading(false));
  }, [fetchSession, fetchPlayers]);

  const checkedInIds = new Set(session?.players.map((p) => p.player_id) || []);

  const filteredPlayers = allPlayers.filter((p) => {
    if (checkedInIds.has(p.id)) return false;
    if (search.trim()) {
      return p.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  async function handleCheckIn(playerId: number) {
    if (!session) return;
    await fetch(`/api/sessions/${session.id}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId }),
    });
    await fetchSession();
  }

  async function handleRemoveCheckIn(playerId: number) {
    if (!session) return;
    await fetch(`/api/sessions/${session.id}/checkin`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId }),
    });
    await fetchSession();
  }

  async function handleAddPlayer() {
    if (!newPlayerName.trim()) return;
    setError('');
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlayerName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to add player');
        return;
      }
      const player = await res.json();
      setNewPlayerName('');
      setShowAddModal(false);
      await fetchPlayers();
      if (session) {
        await handleCheckIn(player.id);
      }
    } catch {
      setError('Failed to add player');
    }
  }

  async function handleGenerate() {
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
      setShowGenerateModal(false);
      window.location.href = `/court/${slug}/matches`;
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
        <div>
          <h1>Check In</h1>
          <p className="text-muted text-sm">
            {session
              ? new Date(session.date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })
              : 'No session'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="badge badge-active">{activePlayers.length} Active</span>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-dim)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {session && session.players.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-4">Checked In ({session.players.length})</h3>
          <div className="player-grid">
            {session.players.map((p) => (
              <div
                key={p.player_id}
                className={`player-tile ${p.is_active ? 'active' : 'sitting'}`}
                onClick={() => handleRemoveCheckIn(p.player_id)}
              >
                <span className="name">{p.name}</span>
                <span className="elo">{p.elo_rating} Elo</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activePlayers.length >= 4 && (
        <button
          className="btn btn-primary btn-full mb-6"
          onClick={() => setShowGenerateModal(true)}
        >
          Generate Matches ({activePlayers.length} players)
        </button>
      )}

      <div className="mb-4">
        <div className="section-header">
          <h3>All Players</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(true)}>
            + Add Player
          </button>
        </div>
        <input
          className="input mb-4"
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="player-list">
          {filteredPlayers.map((p) => (
            <div key={p.id} className="player-list-item">
              <div className="info">
                <span className="name">{p.name}</span>
                <span className="elo">{p.elo_rating} Elo &middot; {p.wins}W-{p.losses}L</span>
              </div>
              <button className="btn btn-success btn-sm" onClick={() => handleCheckIn(p.id)}>
                Check In
              </button>
            </div>
          ))}
          {filteredPlayers.length === 0 && (
            <p className="text-muted text-center mt-4">
              {search ? 'No players found' : 'All players checked in'}
            </p>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Player</h2>
            <input
              className="input mb-4"
              placeholder="Player name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddPlayer} disabled={!newPlayerName.trim()}>
                Add & Check In
              </button>
            </div>
          </div>
        </div>
      )}

      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Generate Matches</h2>
            <p className="text-muted mb-4">{activePlayers.length} active players</p>
            <div className="mb-4">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Team Size</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[2, 3, 4].map((size) => (
                  <button
                    key={size}
                    className={`btn ${teamSize === size ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setTeamSize(size)}
                  >
                    {size}v{size}
                  </button>
                ))}
              </div>
            </div>
            {activePlayers.length < teamSize * 2 && (
              <p style={{ color: 'var(--danger)', marginBottom: '12px' }}>
                Need at least {teamSize * 2} active players for {teamSize}v{teamSize}
              </p>
            )}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowGenerateModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleGenerate}
                disabled={activePlayers.length < teamSize * 2}
              >
                Auto-Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
