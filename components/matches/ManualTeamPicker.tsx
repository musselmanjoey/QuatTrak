'use client';

import { useState, useRef } from 'react';

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
  defaultTeamSize?: number;
}

type DropTarget = 'team1' | 'team2' | 'pool' | null;

export default function ManualTeamPicker({ activePlayers, sessionId, onClose, onCreated, editMatch, defaultTeamSize }: ManualTeamPickerProps) {
  const [teamSize, setTeamSize] = useState(editMatch ? editMatch.team1.length : (defaultTeamSize || 2));
  const [team1Picks, setTeam1Picks] = useState<number[]>(editMatch?.team1 ?? []);
  const [team2Picks, setTeam2Picks] = useState<number[]>(editMatch?.team2 ?? []);
  const [error, setError] = useState('');
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const draggedPlayer = useRef<{ id: number; from: 'team1' | 'team2' | 'pool' } | null>(null);

  const teamsValid = team1Picks.length === teamSize && team2Picks.length === teamSize;

  function getPlayerName(id: number) {
    return activePlayers.find((p) => p.player_id === id)?.name ?? '?';
  }

  const unassigned = activePlayers.filter(
    (p) => !team1Picks.includes(p.player_id) && !team2Picks.includes(p.player_id)
  );

  // Tap an unassigned player — fill team1 first, then team2
  function handleTapPool(playerId: number) {
    if (team1Picks.length < teamSize) {
      setTeam1Picks((prev) => [...prev, playerId]);
    } else {
      setTeam2Picks((prev) => [...prev, playerId]);
    }
  }

  // Tap a player in a team — remove back to pool
  function handleTapTeamPlayer(playerId: number, team: 'team1' | 'team2') {
    if (team === 'team1') {
      setTeam1Picks((prev) => prev.filter((id) => id !== playerId));
    } else {
      setTeam2Picks((prev) => prev.filter((id) => id !== playerId));
    }
  }

  // --- Drag & drop helpers ---
  function removeFromSource(id: number, from: 'team1' | 'team2' | 'pool') {
    if (from === 'team1') setTeam1Picks((prev) => prev.filter((pid) => pid !== id));
    else if (from === 'team2') setTeam2Picks((prev) => prev.filter((pid) => pid !== id));
  }

  function addToTarget(id: number, target: 'team1' | 'team2') {
    if (target === 'team1') setTeam1Picks((prev) => [...prev, id]);
    else setTeam2Picks((prev) => [...prev, id]);
  }

  // Mouse drag
  function handleDragStart(playerId: number, from: 'team1' | 'team2' | 'pool') {
    draggedPlayer.current = { id: playerId, from };
  }

  function handleDragOver(e: React.DragEvent, target: DropTarget) {
    e.preventDefault();
    setDropTarget(target);
  }

  function handleDragLeave() {
    setDropTarget(null);
  }

  function handleDrop(target: 'team1' | 'team2' | 'pool') {
    setDropTarget(null);
    const dragged = draggedPlayer.current;
    if (!dragged) return;
    const { id, from } = dragged;
    draggedPlayer.current = null;
    if (from === target) return;

    removeFromSource(id, from);
    if (target !== 'pool') addToTarget(id, target);
  }

  // Touch drag
  const touchState = useRef<{ id: number; from: 'team1' | 'team2' | 'pool'; el: HTMLElement | null }>({ id: 0, from: 'pool', el: null });

  function handleTouchStart(e: React.TouchEvent, playerId: number, from: 'team1' | 'team2' | 'pool') {
    const touch = e.touches[0];
    const el = e.currentTarget as HTMLElement;
    const clone = el.cloneNode(true) as HTMLElement;
    clone.id = 'drag-ghost';
    clone.style.position = 'fixed';
    clone.style.left = `${touch.clientX - 40}px`;
    clone.style.top = `${touch.clientY - 20}px`;
    clone.style.opacity = '0.85';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '9999';
    clone.style.transform = 'scale(1.05)';
    document.body.appendChild(clone);
    touchState.current = { id: playerId, from, el: clone };
  }

  function handleTouchMove(e: React.TouchEvent) {
    const ghost = touchState.current.el;
    if (!ghost) return;
    const touch = e.touches[0];
    ghost.style.left = `${touch.clientX - 40}px`;
    ghost.style.top = `${touch.clientY - 20}px`;

    const dropZones = document.querySelectorAll('[data-drop-zone]');
    let over: DropTarget = null;
    dropZones.forEach((zone) => {
      const rect = zone.getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right && touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        over = zone.getAttribute('data-drop-zone') as DropTarget;
      }
    });
    setDropTarget(over);
  }

  function handleTouchEnd() {
    const ghost = touchState.current.el;
    if (ghost) ghost.remove();

    const { id, from } = touchState.current;
    if (id && dropTarget && from !== dropTarget) {
      removeFromSource(id, from);
      if (dropTarget !== 'pool') addToTarget(id, dropTarget);
    }
    touchState.current = { id: 0, from: 'pool', el: null };
    setDropTarget(null);
  }

  async function handleSubmit() {
    if (!teamsValid) return;
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

  function countStyle(count: number): React.CSSProperties {
    if (count === teamSize) return { color: 'var(--success)' };
    if (count > teamSize) return { color: 'var(--danger)' };
    return {};
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
              onClick={() => setTeamSize(size)}
            >
              {size}v{size}
            </button>
          ))}
        </div>

        {/* Unassigned player pool — always visible as a drop target */}
        <div
          className={`player-pool ${dropTarget === 'pool' ? 'drop-hover' : ''}`}
          data-drop-zone="pool"
          onDragOver={(e) => handleDragOver(e, 'pool')}
          onDragLeave={handleDragLeave}
          onDrop={() => handleDrop('pool')}
        >
          <div className="pool-label">Unassigned ({unassigned.length})</div>
          {unassigned.length > 0 ? (
            <div className="available-players">
              {unassigned.map((p) => (
                <div
                  key={p.player_id}
                  className="pick-tile"
                  draggable
                  onClick={() => handleTapPool(p.player_id)}
                  onDragStart={() => handleDragStart(p.player_id, 'pool')}
                  onTouchStart={(e) => handleTouchStart(e, p.player_id, 'pool')}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {p.name}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm text-center">All players assigned</p>
          )}
        </div>

        <p className="text-sm text-muted mb-4" style={{ marginTop: '12px' }}>
          Tap to assign/remove. Drag between zones to move.
        </p>

        {/* Team columns */}
        <div className="team-picker">
          <div
            className={`team-column team1 ${dropTarget === 'team1' ? 'drop-hover' : ''}`}
            data-drop-zone="team1"
            onDragOver={(e) => handleDragOver(e, 'team1')}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop('team1')}
          >
            <div className="team-column-header" style={{ color: 'var(--team1)' }}>
              Team 1 (<span style={countStyle(team1Picks.length)}>{team1Picks.length}</span>/{teamSize})
            </div>
            {team1Picks.map((id) => (
              <div
                key={id}
                className="pick-tile team1"
                style={{ marginBottom: '6px', width: '100%', textAlign: 'center' }}
                draggable
                onClick={() => handleTapTeamPlayer(id, 'team1')}
                onDragStart={() => handleDragStart(id, 'team1')}
                onTouchStart={(e) => handleTouchStart(e, id, 'team1')}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {getPlayerName(id)}
              </div>
            ))}
            {team1Picks.length === 0 && (
              <p className="text-muted text-sm text-center" style={{ marginTop: '24px' }}>Tap players to add</p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="match-vs">VS</span>
          </div>

          <div
            className={`team-column team2 ${dropTarget === 'team2' ? 'drop-hover' : ''}`}
            data-drop-zone="team2"
            onDragOver={(e) => handleDragOver(e, 'team2')}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop('team2')}
          >
            <div className="team-column-header" style={{ color: 'var(--team2)' }}>
              Team 2 (<span style={countStyle(team2Picks.length)}>{team2Picks.length}</span>/{teamSize})
            </div>
            {team2Picks.map((id) => (
              <div
                key={id}
                className="pick-tile team2"
                style={{ marginBottom: '6px', width: '100%', textAlign: 'center' }}
                draggable
                onClick={() => handleTapTeamPlayer(id, 'team2')}
                onDragStart={() => handleDragStart(id, 'team2')}
                onTouchStart={(e) => handleTouchStart(e, id, 'team2')}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {getPlayerName(id)}
              </div>
            ))}
            {team2Picks.length === 0 && (
              <p className="text-muted text-sm text-center" style={{ marginTop: '24px' }}>Tap players to add</p>
            )}
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
            disabled={!teamsValid}
          >
            {editMatch ? 'Save Teams' : 'Start Match'}
          </button>
        </div>
      </div>
    </div>
  );
}
