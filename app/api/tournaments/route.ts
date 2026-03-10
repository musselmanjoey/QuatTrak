import { NextRequest, NextResponse } from 'next/server';
import { listTournaments, createTournament } from '@/lib/tournamentService';

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get('status') || undefined;
    const tournaments = await listTournaments(status);
    return NextResponse.json(tournaments);
  } catch (error) {
    console.error('GET /api/tournaments error:', error);
    return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, format, team_size, organizer_player_id } = await request.json();

    if (!name || !format || !organizer_player_id) {
      return NextResponse.json({ error: 'name, format, and organizer_player_id are required' }, { status: 400 });
    }

    if (!['single_elimination', 'round_robin'].includes(format)) {
      return NextResponse.json({ error: 'format must be single_elimination or round_robin' }, { status: 400 });
    }

    const tournament = await createTournament(name, format, team_size || 2, organizer_player_id);
    return NextResponse.json(tournament, { status: 201 });
  } catch (error) {
    console.error('POST /api/tournaments error:', error);
    return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 });
  }
}
