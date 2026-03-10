import { NextRequest, NextResponse } from 'next/server';
import { getRoundRobinStandings } from '@/lib/bracketService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const standings = await getRoundRobinStandings(parseInt(id));
    return NextResponse.json(standings);
  } catch (error) {
    console.error('GET standings error:', error);
    return NextResponse.json({ error: 'Failed to fetch standings' }, { status: 500 });
  }
}
