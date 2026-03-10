'use client';

import { useState } from 'react';
import { TournamentTeamWithPlayers } from '@/lib/types';

interface Props {
  tournamentId: string;
  teams: TournamentTeamWithPlayers[];
  onTeamsChanged: () => void;
}

export default function TeamManager({ tournamentId, teams, onTeamsChanged }: Props) {
  const [newTeamName, setNewTeamName] = useState('');
  const [editingTeam, setEditingTeam] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [addPlayerSearch, setAddPlayerSearch] = useState<{ teamId: number; query: string } | null>(null);
  const [searchResults, setSearchResults] = useState<{ id: number; name: string; elo_rating: number }[]>([]);
  const [error, setError] = useState('');

  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    setError('');
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });
      if (!res.ok) throw new Error();
      setNewTeamName('');
      onTeamsChanged();
    } catch {
      setError('Failed to create team');
    }
  };

  const saveTeamName = async (teamId: number) => {
    if (!editName.trim()) return;
    try {
      await fetch(`/api/tournaments/${tournamentId}/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      setEditingTeam(null);
      onTeamsChanged();
    } catch {
      setError('Failed to rename team');
    }
  };

  const deleteTeam = async (teamId: number) => {
    try {
      await fetch(`/api/tournaments/${tournamentId}/teams/${teamId}`, { method: 'DELETE' });
      onTeamsChanged();
    } catch {
      setError('Failed to delete team');
    }
  };

  const searchPlayers = async (teamId: number, query: string) => {
    setAddPlayerSearch({ teamId, query });
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/players?search=${encodeURIComponent(query)}`);
      setSearchResults(await res.json());
    } catch {
      setSearchResults([]);
    }
  };

  const addPlayer = async (teamId: number, playerId: number) => {
    try {
      await fetch(`/api/tournaments/${tournamentId}/teams/${teamId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId }),
      });
      setAddPlayerSearch(null);
      setSearchResults([]);
      onTeamsChanged();
    } catch {
      setError('Failed to add player');
    }
  };

  const removePlayer = async (teamId: number, playerId: number) => {
    try {
      await fetch(`/api/tournaments/${tournamentId}/teams/${teamId}/players`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId }),
      });
      onTeamsChanged();
    } catch {
      setError('Failed to remove player');
    }
  };

  return (
    <div>
      {error && (
        <div style={{ background: 'var(--danger-dim)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Create new team */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <input
          className="input"
          placeholder="New team name"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createTeam()}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary btn-sm" onClick={createTeam} disabled={!newTeamName.trim()}>
          Add
        </button>
      </div>

      {/* Team list */}
      {teams.map((team) => (
        <div key={team.id} className="card" style={{ marginBottom: '12px' }}>
          <div className="section-header" style={{ marginBottom: '12px' }}>
            {editingTeam === team.id ? (
              <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                <input
                  className="input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveTeamName(team.id)}
                  style={{ flex: 1, minHeight: '40px', padding: '8px 12px' }}
                  autoFocus
                />
                <button className="btn btn-primary btn-sm" onClick={() => saveTeamName(team.id)}>Save</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditingTeam(null)}>Cancel</button>
              </div>
            ) : (
              <>
                <div>
                  <h3 style={{ margin: 0 }}>{team.name}</h3>
                  <span className="text-sm text-muted">
                    {team.seed ? `Seed #${team.seed}` : 'Unseeded'}
                    {team.avg_elo > 0 && ` | Avg ${team.avg_elo} Elo`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setEditingTeam(team.id); setEditName(team.name); }}
                    style={{ padding: '6px 10px', minHeight: '36px', fontSize: '14px' }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => deleteTeam(team.id)}
                    style={{ padding: '6px 10px', minHeight: '36px', fontSize: '14px' }}
                  >
                    Del
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Players on this team */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            {team.players.map((p) => (
              <span
                key={p.id}
                className="pick-tile team1"
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={() => removePlayer(team.id, p.id)}
              >
                {p.name}
                <span style={{ fontSize: '12px', opacity: 0.7 }}>x</span>
              </span>
            ))}
          </div>

          {/* Add player search */}
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              placeholder="Add player..."
              value={addPlayerSearch?.teamId === team.id ? addPlayerSearch.query : ''}
              onChange={(e) => searchPlayers(team.id, e.target.value)}
              onFocus={() => !addPlayerSearch && setAddPlayerSearch({ teamId: team.id, query: '' })}
              style={{ minHeight: '40px', padding: '8px 12px', fontSize: '16px' }}
            />
            {addPlayerSearch?.teamId === team.id && searchResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', maxHeight: '160px', overflowY: 'auto'
              }}>
                {searchResults
                  .filter(p => !team.players.some(tp => tp.id === p.id))
                  .map(p => (
                    <button
                      key={p.id}
                      style={{
                        display: 'flex', justifyContent: 'space-between', width: '100%',
                        padding: '10px 16px', background: 'transparent', border: 'none',
                        color: 'var(--text-primary)', fontSize: '16px', cursor: 'pointer'
                      }}
                      onClick={() => addPlayer(team.id, p.id)}
                    >
                      <span>{p.name}</span>
                      <span className="text-muted text-sm">{p.elo_rating}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {teams.length === 0 && (
        <p className="text-muted text-center mt-6">No teams yet. Create one above.</p>
      )}
    </div>
  );
}
