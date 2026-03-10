import { NextRequest, NextResponse } from 'next/server';
import { getMatchById, recordTournamentMatchResult } from '@/lib/bracketService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const match = await getMatchById(parseInt(matchId));
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    return NextResponse.json(match);
  } catch (error) {
    console.error('GET tournament match error:', error);
    return NextResponse.json({ error: 'Failed to fetch match' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const { score_team1, score_team2, reported_by_player_id, is_override } = await request.json();

    if (score_team1 === undefined || score_team2 === undefined) {
      return NextResponse.json({ error: 'score_team1 and score_team2 are required' }, { status: 400 });
    }

    if (score_team1 === score_team2) {
      return NextResponse.json({ error: 'Scores cannot be tied' }, { status: 400 });
    }

    const match = await recordTournamentMatchResult(
      parseInt(matchId),
      score_team1,
      score_team2,
      reported_by_player_id || null,
      is_override
    );
    return NextResponse.json(match);
  } catch (error) {
    const message = (error as Error).message;
    console.error('PATCH tournament match error:', error);

    if (message === 'Match not found') {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === 'Match already completed') {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message === 'Match teams not set') {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to record result' }, { status: 500 });
  }
}
