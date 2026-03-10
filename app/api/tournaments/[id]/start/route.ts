import { NextRequest, NextResponse } from 'next/server';
import { getTournamentById, updateTournamentStatus } from '@/lib/tournamentService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id);

    const tournament = await getTournamentById(tournamentId);
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.status !== 'setup') {
      return NextResponse.json({ error: 'Tournament must be in setup status to start' }, { status: 409 });
    }

    if (tournament.match_count === 0) {
      return NextResponse.json({ error: 'Generate bracket before starting' }, { status: 400 });
    }

    const updated = await updateTournamentStatus(tournamentId, 'active');
    return NextResponse.json(updated);
  } catch (error) {
    console.error('POST start error:', error);
    return NextResponse.json({ error: 'Failed to start tournament' }, { status: 500 });
  }
}
