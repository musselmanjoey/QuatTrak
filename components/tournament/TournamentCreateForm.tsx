'use client';

import { useState } from 'react';

interface Court {
  id: number;
  name: string;
  slug: string;
}

interface Props {
  courts: Court[];
  onSubmit: (data: {
    name: string;
    format: 'single_elimination' | 'round_robin';
    teamSize: number;
    organizerPlayerId: number;
    courtIds: number[];
  }) => Promise<void>;
}

export default function TournamentCreateForm({ courts, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [format, setFormat] = useState<'single_elimination' | 'round_robin'>('single_elimination');
  const [teamSize, setTeamSize] = useState(2);
  const [organizerName, setOrganizerName] = useState('');
  const [organizerPlayerId, setOrganizerPlayerId] = useState<number | null>(null);
  const [selectedCourts, setSelectedCourts] = useState<number[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ id: number; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const searchOrganizer = async (query: string) => {
    setOrganizerName(query);
    setOrganizerPlayerId(null);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/players?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const toggleCourt = (id: number) => {
    setSelectedCourts(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || !organizerPlayerId) return;
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        name: name.trim(),
        format,
        teamSize,
        organizerPlayerId,
        courtIds: selectedCourts,
      });
    } catch {
      setError('Failed to create tournament');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
          Tournament Name
        </label>
        <input
          className="input"
          placeholder="e.g. Spring Classic"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
          Format
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn btn-sm ${format === 'single_elimination' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => setFormat('single_elimination')}
          >
            Single Elim
          </button>
          <button
            className={`btn btn-sm ${format === 'round_robin' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => setFormat('round_robin')}
          >
            Round Robin
          </button>
        </div>
      </div>

      <div>
        <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
          Team Size
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[1, 2, 3, 4].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${teamSize === s ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setTeamSize(s)}
            >
              {s === 1 ? '1v1' : `${s}v${s}`}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
          Organizer (your name)
        </label>
        <input
          className="input"
          placeholder="Search players..."
          value={organizerName}
          onChange={(e) => searchOrganizer(e.target.value)}
        />
        {organizerPlayerId && (
          <span className="badge badge-active" style={{ position: 'absolute', right: '12px', top: '38px' }}>
            Confirmed
          </span>
        )}
        {searchResults.length > 0 && !organizerPlayerId && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', maxHeight: '200px', overflowY: 'auto'
          }}>
            {searchResults.map(p => (
              <button
                key={p.id}
                style={{
                  display: 'block', width: '100%', padding: '12px 16px',
                  background: 'transparent', border: 'none', color: 'var(--text-primary)',
                  fontSize: '16px', textAlign: 'left', cursor: 'pointer'
                }}
                onClick={() => {
                  setOrganizerPlayerId(p.id);
                  setOrganizerName(p.name);
                  setSearchResults([]);
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
        {searching && <p className="text-muted text-sm" style={{ marginTop: '4px' }}>Searching...</p>}
      </div>

      {courts.length > 0 && (
        <div>
          <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
            Courts (optional)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {courts.map(c => (
              <button
                key={c.id}
                className={`btn btn-sm ${selectedCourts.includes(c.id) ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => toggleCourt(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: 'var(--danger-dim)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
          {error}
        </div>
      )}

      <button
        className="btn btn-primary btn-full mt-4"
        disabled={!name.trim() || !organizerPlayerId || submitting}
        onClick={handleSubmit}
      >
        {submitting ? 'Creating...' : 'Create Tournament'}
      </button>
    </div>
  );
}
