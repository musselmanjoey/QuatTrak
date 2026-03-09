import { NextRequest, NextResponse } from 'next/server';
import { getMatchesBySession } from '@/lib/matchService';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    const matches = await getMatchesBySession(parseInt(sessionId));
    return NextResponse.json(matches);
  } catch (error) {
    console.error('GET /api/matches error:', error);
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
  }
}
