'use client';

import { useState } from 'react';

interface Props {
  onIdentified: (playerId: number) => void;
}

export default function PlayerIdentify({ onIdentified }: Props) {
  const [name, setName] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ id: number; name: string }[]>([]);
  const [error, setError] = useState('');

  const search = async () => {
    if (!name.trim()) return;
    setSearching(true);
    setError('');
    try {
      const res = await fetch(`/api/players?search=${encodeURIComponent(name.trim())}`);
      const data = await res.json();
      if (data.length === 0) {
        setError('No players found with that name.');
      }
      setResults(data);
    } catch {
      setError('Search failed');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          className="input"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <button className="btn btn-primary btn-sm" onClick={search} disabled={searching || !name.trim()}>
          {searching ? '...' : 'Find'}
        </button>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-dim)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="player-list">
          <p className="text-sm text-muted" style={{ marginBottom: '8px' }}>Select yourself:</p>
          {results.map((p) => (
            <button
              key={p.id}
              className="player-list-item"
              style={{ width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onClick={() => onIdentified(p.id)}
            >
              <span className="info">
                <span className="name">{p.name}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
