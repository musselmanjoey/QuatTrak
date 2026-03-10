'use client';

import { useState } from 'react';

interface Props {
  tournamentId: string;
  matchId: number;
  team1Name: string;
  team2Name: string;
  playerId: number | null;
  onScoreReported: () => void;
}

export default function ScoreReporter({
  tournamentId,
  matchId,
  team1Name,
  team2Name,
  playerId,
  onScoreReported,
}: Props) {
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const s1 = parseInt(score1);
  const s2 = parseInt(score2);
  const valid = !isNaN(s1) && !isNaN(s2) && s1 !== s2 && s1 >= 0 && s2 >= 0;

  const handleSubmit = async () => {
    if (!valid) return;

    if (!confirming) {
      setConfirming(true);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score_team1: s1,
          score_team2: s2,
          reported_by_player_id: playerId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      onScoreReported();
    } catch (e) {
      setError((e as Error).message);
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (confirming) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h3 style={{ marginBottom: '16px' }}>Confirm Score</h3>
        <div style={{ fontSize: '20px', marginBottom: '20px' }}>
          <span style={{ color: 'var(--team1)', fontWeight: 700 }}>{team1Name}: {s1}</span>
          <span style={{ margin: '0 12px', color: 'var(--text-muted)' }}>vs</span>
          <span style={{ color: 'var(--team2)', fontWeight: 700 }}>{team2Name}: {s2}</span>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-dim)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirming(false)} disabled={submitting}>
            Back
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Confirm'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: '16px' }}>Report Score</h3>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--team1)', display: 'block', marginBottom: '4px' }}>
            {team1Name}
          </label>
          <input
            className="input"
            type="number"
            min="0"
            placeholder="0"
            value={score1}
            onChange={(e) => setScore1(e.target.value)}
            style={{ textAlign: 'center', fontSize: '24px', fontWeight: 700 }}
          />
        </div>
        <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-muted)', paddingTop: '24px' }}>-</span>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--team2)', display: 'block', marginBottom: '4px' }}>
            {team2Name}
          </label>
          <input
            className="input"
            type="number"
            min="0"
            placeholder="0"
            value={score2}
            onChange={(e) => setScore2(e.target.value)}
            style={{ textAlign: 'center', fontSize: '24px', fontWeight: 700 }}
          />
        </div>
      </div>

      {score1 && score2 && s1 === s2 && (
        <p style={{ color: 'var(--danger)', fontSize: '14px', marginBottom: '12px' }}>
          Scores cannot be tied.
        </p>
      )}

      <button
        className="btn btn-primary btn-full"
        disabled={!valid}
        onClick={handleSubmit}
      >
        Submit Score
      </button>
    </div>
  );
}
