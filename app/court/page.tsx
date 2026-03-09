'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Court {
  id: number;
  name: string;
  slug: string;
}

export default function CourtPickerPage() {
  const router = useRouter();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [error, setError] = useState('');

  const fetchCourts = useCallback(async () => {
    try {
      const res = await fetch('/api/courts');
      const data = await res.json();
      setCourts(data);
    } catch {
      setError('Failed to load courts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourts();
  }, [fetchCourts]);

  function handleNameChange(name: string) {
    setNewName(name);
    setNewSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  }

  async function handleCreate() {
    if (!newName.trim() || !newSlug.trim()) return;
    setError('');
    try {
      const res = await fetch('/api/courts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), slug: newSlug.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create court');
        return;
      }
      setNewName('');
      setNewSlug('');
      setShowCreateModal(false);
      await fetchCourts();
    } catch {
      setError('Failed to create court');
    }
  }

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
        <h1>Select Court</h1>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(true)}>
          + New Court
        </button>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-dim)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className="player-grid">
        {courts.map((court) => (
          <div
            key={court.id}
            className="player-tile active"
            onClick={() => router.push(`/court/${court.slug}`)}
            style={{ cursor: 'pointer' }}
          >
            <span className="name">{court.name}</span>
            <span className="elo">/{court.slug}</span>
          </div>
        ))}
        {courts.length === 0 && (
          <p className="text-muted text-center mt-4">No courts yet. Create one to get started.</p>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Court</h2>
            <input
              className="input mb-4"
              placeholder="Court name (e.g. Joey's Net)"
              value={newName}
              onChange={(e) => handleNameChange(e.target.value)}
              autoFocus
            />
            <input
              className="input mb-4"
              placeholder="Slug (e.g. joeys-net)"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreate} disabled={!newName.trim() || !newSlug.trim()}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
