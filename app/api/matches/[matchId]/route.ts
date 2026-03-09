import { NextRequest, NextResponse } from 'next/server';
import { recordMatchResult } from '@/lib/matchService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const { winning_team } = await request.json();

    if (winning_team !== 1 && winning_team !== 2) {
      return NextResponse.json({ error: 'winning_team must be 1 or 2' }, { status: 400 });
    }

    const match = await recordMatchResult(parseInt(matchId), winning_team);
    return NextResponse.json(match);
  } catch (error) {
    const message = (error as Error).message;
    console.error('PATCH match error:', error);

    if (message === 'Match not found') {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === 'Match already completed') {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: 'Failed to record result' }, { status: 500 });
  }
}
