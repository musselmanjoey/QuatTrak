import { NextRequest, NextResponse } from 'next/server';
import { getTournamentById } from '@/lib/tournamentService';
import { autoSeedTeams } from '@/lib/tournamentTeamService';
import { generateSingleEliminationBracket, generateRoundRobinSchedule } from '@/lib/bracketService';

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
      return NextResponse.json({ error: 'Tournament must be in setup status' }, { status: 409 });
    }

    // Auto-seed teams first
    await autoSeedTeams(tournamentId);

    // Generate bracket/schedule based on format
    if (tournament.format === 'single_elimination') {
      await generateSingleEliminationBracket(tournamentId);
    } else {
      await generateRoundRobinSchedule(tournamentId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    console.error('POST generate error:', error);

    if (message.includes('Need at least')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to generate bracket' }, { status: 500 });
  }
}
