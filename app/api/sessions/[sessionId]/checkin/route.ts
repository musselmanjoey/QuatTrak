import { NextRequest, NextResponse } from 'next/server';
import { checkInPlayer, removeCheckIn } from '@/lib/sessionService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { player_id } = await request.json();

    if (!player_id) {
      return NextResponse.json({ error: 'player_id is required' }, { status: 400 });
    }

    await checkInPlayer(parseInt(sessionId), player_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST checkin error:', error);
    return NextResponse.json({ error: 'Failed to check in' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { player_id } = await request.json();

    if (!player_id) {
      return NextResponse.json({ error: 'player_id is required' }, { status: 400 });
    }

    await removeCheckIn(parseInt(sessionId), player_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE checkin error:', error);
    return NextResponse.json({ error: 'Failed to remove check-in' }, { status: 500 });
  }
}
