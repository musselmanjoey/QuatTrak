import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/leaderboardService';

export async function GET(request: NextRequest) {
  try {
    const minGames = parseInt(request.nextUrl.searchParams.get('min_games') || '0');
    const leaderboard = await getLeaderboard(minGames);
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('GET /api/leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
