import { NextRequest, NextResponse } from 'next/server';
import { getPlayerMatches } from '@/lib/bracketService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const playerId = request.nextUrl.searchParams.get('player_id');

    if (!playerId) {
      return NextResponse.json({ error: 'player_id is required' }, { status: 400 });
    }

    const matches = await getPlayerMatches(parseInt(id), parseInt(playerId));
    return NextResponse.json(matches);
  } catch (error) {
    console.error('GET my-matches error:', error);
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
  }
}
