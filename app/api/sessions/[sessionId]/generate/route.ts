import { NextRequest, NextResponse } from 'next/server';
import { generateMatches } from '@/lib/matchService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { team_size, mode = 'auto', teams } = body;

    if (!team_size || team_size < 1 || team_size > 6) {
      return NextResponse.json({ error: 'team_size must be between 1 and 6' }, { status: 400 });
    }

    const manualTeams = mode === 'manual' && teams ? [teams] : undefined;

    const matches = await generateMatches(
      parseInt(sessionId),
      team_size,
      mode,
      manualTeams
    );

    return NextResponse.json(matches, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    console.error('POST generate error:', error);
    return NextResponse.json({ error: message || 'Failed to generate matches' }, { status: 400 });
  }
}
