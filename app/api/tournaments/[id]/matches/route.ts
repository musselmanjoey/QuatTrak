import { NextRequest, NextResponse } from 'next/server';
import { getTournamentMatches } from '@/lib/bracketService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const matches = await getTournamentMatches(parseInt(id));
    return NextResponse.json(matches);
  } catch (error) {
    console.error('GET tournament matches error:', error);
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
  }
}
