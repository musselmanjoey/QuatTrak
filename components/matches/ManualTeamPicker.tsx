'use client';

import { useState } from 'react';

interface ActivePlayer {
  player_id: number;
  is_active: boolean;
  name: string;
  elo_rating: number;
}

interface EditMatch {
  matchId: number;
  team1: number[];
  team2: number[];
}

interface ManualTeamPickerProps {
  activePlayers: ActivePlayer[];
  sessionId: number;
  onClose: () => void;
  onCreated: () => void;
  editMatch?: EditMatch;
}

export default function ManualTeamPicker({ activePlayers, sessionId, onClose, onCreated, editMatch }: ManualTeamPickerProps) {
  const [teamSize, setTeamSize] = useState(editMatch ? editMatch.team1.length : 2);
  const [team1Picks, setTeam1Picks] = useState<number[]>(editMatch?.team1 ?? []);
  const [team2Picks, setTeam2Picks] = useState<number[]>(editMatch?.team2 ?? []);
  const [error, setError] = useState('');

  function handlePickPlayer(playerId: number) {
    if (team1Picks.includes(playerId)) {
      setTeam1Picks((prev) => prev.filter((id) => id !== playerId));
      if (team2Picks.length < teamSize) {
        setTeam2Picks((prev) => [...prev, playerId]);
      }
    } else if (team2Picks.includes(playerId)) {
      setTeam2Picks((prev) => prev.filter((id) => id !== playerId));
    } else {
      if (team1Picks.length < teamSize) {
        setTeam1Picks((prev) => [...prev, playerId]);
      } else if (team2Picks.length < teamSize) {
        setTeam2Picks((prev) => [...prev, playerId]);
      }
    }
  }

  async function handleSubmit() {
    if (team1Picks.length !== teamSize || team2Picks.length !== teamSize) return;
    setError('');
    try {
      let res: Response;
      if (editMatch) {
        res = await fetch(`/api/matches/${editMatch.matchId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team1: team1Picks, team2: team2Picks }),
        });
      } else {
        res = await fetch(`/api/sessions/${sessionId}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            team_size: teamSize,
            mode: 'manual',
            teams: { team1: team1Picks, team2: team2Picks },
          }),
        });
      }
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || (editMatch ? 'Failed to update teams' : 'Failed to create match'));
        return;
      }
      onCreated();
    } catch {
      setError(editMatch ? 'Failed to update teams' : 'Failed to create match');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4">{editMatch ? 'Edit Teams' : 'Pick Teams'}</h2>

        {error && (
          <div style={{ background: 'var(--danger-dim)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div className="mb-4" style={{ display: 'flex', gap: '8px' }}>
          {[2, 3, 4].map((size) => (
            <button
              key={size}
              className={`btn btn-sm ${teamSize === size ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setTeamSize(size);
                setTeam1Picks([]);
                setTeam2Picks([]);
              }}
            >
              {size}v{size}
            </button>
          ))}
        </div>

        <p className="text-sm text-muted mb-4">
          Tap to assign: Team 1 &rarr; Team 2 &rarr; Unassign
        </p>

        <div className="available-players">
          {activePlayers.map((p) => {
            let tileClass = 'pick-tile';
            if (team1Picks.includes(p.player_id)) tileClass += ' team1';
            else if (team2Picks.includes(p.player_id)) tileClass += ' team2';

            return (
              <div
                key={p.player_id}
                className={tileClass}
                onClick={() => handlePickPlayer(p.player_id)}
              >
                {p.name}
              </div>
            );
          })}
        </div>

        <div className="team-picker">
          <div className="team-column team1">
            <div className="team-column-header" style={{ color: 'var(--team1)' }}>
              Team 1 ({team1Picks.length}/{teamSize})
            </div>
            {team1Picks.map((id) => {
              const p = activePlayers.find((p) => p.player_id === id);
              return p ? <div key={id} className="team-player">{p.name}</div> : null;
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="match-vs">VS</span>
          </div>
          <div className="team-column team2">
            <div className="team-column-header" style={{ color: 'var(--team2)' }}>
              Team 2 ({team2Picks.length}/{teamSize})
            </div>
            {team2Picks.map((id) => {
              const p = activePlayers.find((p) => p.player_id === id);
              return p ? <div key={id} className="team-player">{p.name}</div> : null;
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleSubmit}
            disabled={team1Picks.length !== teamSize || team2Picks.length !== teamSize}
          >
            {editMatch ? 'Save Teams' : 'Start Match'}
          </button>
        </div>
      </div>
    </div>
  );
}
