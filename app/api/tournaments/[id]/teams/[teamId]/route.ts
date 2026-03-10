import { NextRequest, NextResponse } from 'next/server';
import { updateTeam, deleteTeam } from '@/lib/tournamentTeamService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const team = await updateTeam(parseInt(teamId), name);
    return NextResponse.json(team);
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'Team not found') {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error('PATCH team error:', error);
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const { teamId } = await params;
    await deleteTeam(parseInt(teamId));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'Team not found') {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error('DELETE team error:', error);
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
}
