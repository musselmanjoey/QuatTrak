import { NextRequest, NextResponse } from 'next/server';
import { getPlayerProfile } from '@/lib/leaderboardService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await getPlayerProfile(parseInt(id));

    if (!profile) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('GET /api/players/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch player' }, { status: 500 });
  }
}
