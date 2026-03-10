import { NextRequest, NextResponse } from 'next/server';
import { addPlayerToTeam, removePlayerFromTeam } from '@/lib/tournamentTeamService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const { player_id } = await request.json();

    if (!player_id) {
      return NextResponse.json({ error: 'player_id is required' }, { status: 400 });
    }

    await addPlayerToTeam(parseInt(teamId), player_id);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('POST team player error:', error);
    return NextResponse.json({ error: 'Failed to add player' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const { player_id } = await request.json();

    if (!player_id) {
      return NextResponse.json({ error: 'player_id is required' }, { status: 400 });
    }

    await removePlayerFromTeam(parseInt(teamId), player_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE team player error:', error);
    return NextResponse.json({ error: 'Failed to remove player' }, { status: 500 });
  }
}
