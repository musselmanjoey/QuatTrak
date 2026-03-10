import { NextRequest, NextResponse } from 'next/server';
import { assignCourtToMatch } from '@/lib/bracketService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const { court_id } = await request.json();

    if (!court_id) {
      return NextResponse.json({ error: 'court_id is required' }, { status: 400 });
    }

    await assignCourtToMatch(parseInt(matchId), court_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH match court error:', error);
    return NextResponse.json({ error: 'Failed to assign court' }, { status: 500 });
  }
}
