'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PlayerIdentify from '@/components/tournament/PlayerIdentify';

export default function JoinTournamentPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const handleIdentified = (playerId: number) => {
    localStorage.setItem(`tournament_${tournamentId}_player_id`, String(playerId));
    router.push(`/tournament/${tournamentId}/my-matches`);
  };

  return (
    <div className="screen">
      <h1 style={{ marginBottom: '8px' }}>Join Tournament</h1>
      <p className="text-muted" style={{ marginBottom: '24px' }}>
        Enter your name to view your matches and report scores.
      </p>
      <PlayerIdentify onIdentified={handleIdentified} />
    </div>
  );
}
