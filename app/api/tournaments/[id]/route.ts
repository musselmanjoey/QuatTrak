import { NextRequest, NextResponse } from 'next/server';
import { getTournamentById, updateTournamentStatus } from '@/lib/tournamentService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournament = await getTournamentById(parseInt(id));
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }
    return NextResponse.json(tournament);
  } catch (error) {
    console.error('GET /api/tournaments/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch tournament' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    if (!['setup', 'active', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const tournament = await updateTournamentStatus(parseInt(id), status);
    return NextResponse.json(tournament);
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'Tournament not found') {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error('PATCH /api/tournaments/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update tournament' }, { status: 500 });
  }
}
