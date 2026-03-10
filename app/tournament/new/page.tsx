'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TournamentCreateForm from '@/components/tournament/TournamentCreateForm';

interface Court {
  id: number;
  name: string;
  slug: string;
}

export default function NewTournamentPage() {
  const router = useRouter();
  const [courts, setCourts] = useState<Court[]>([]);

  useEffect(() => {
    fetch('/api/courts').then(r => r.json()).then(setCourts).catch(() => {});
  }, []);

  const handleCreate = async (data: {
    name: string;
    format: 'single_elimination' | 'round_robin';
    teamSize: number;
    organizerPlayerId: number;
    courtIds: number[];
  }) => {
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        format: data.format,
        team_size: data.teamSize,
        organizer_player_id: data.organizerPlayerId,
      }),
    });

    if (!res.ok) throw new Error('Failed to create tournament');
    const tournament = await res.json();

    // Add courts
    for (const courtId of data.courtIds) {
      await fetch(`/api/tournaments/${tournament.id}/courts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ court_id: courtId }),
      });
    }

    router.push(`/tournament/${tournament.id}/admin`);
  };

  return (
    <div className="screen">
      <h1 style={{ marginBottom: '24px' }}>Create Tournament</h1>
      <TournamentCreateForm courts={courts} onSubmit={handleCreate} />
    </div>
  );
}
