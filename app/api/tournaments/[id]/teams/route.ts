import { NextRequest, NextResponse } from 'next/server';
import { getTeamsWithPlayers, createTeam } from '@/lib/tournamentTeamService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teams = await getTeamsWithPlayers(parseInt(id));
    return NextResponse.json(teams);
  } catch (error) {
    console.error('GET /api/tournaments/[id]/teams error:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const team = await createTeam(parseInt(id), name);
    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error('POST /api/tournaments/[id]/teams error:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
