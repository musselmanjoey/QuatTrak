'use client';

import { useState } from 'react';

interface Props {
  tournamentId: string;
  matchId: number;
  courts: { id: number; name: string }[];
  currentCourtId: number | null;
  onAssigned: () => void;
}

export default function CourtAssigner({ tournamentId, matchId, courts, currentCourtId, onAssigned }: Props) {
  const [assigning, setAssigning] = useState(false);

  const assign = async (courtId: number) => {
    setAssigning(true);
    try {
      await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/court`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ court_id: courtId }),
      });
      onAssigned();
    } catch {
      // ignore
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {courts.map((c) => (
        <button
          key={c.id}
          className={`btn btn-sm ${c.id === currentCourtId ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '4px 10px', minHeight: '32px', fontSize: '13px' }}
          onClick={() => assign(c.id)}
          disabled={assigning}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
