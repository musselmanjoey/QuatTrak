import { NextRequest, NextResponse } from 'next/server';
import { getTournamentCourts, addCourtToTournament, removeCourtFromTournament } from '@/lib/tournamentService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const courts = await getTournamentCourts(parseInt(id));
    return NextResponse.json(courts);
  } catch (error) {
    console.error('GET tournament courts error:', error);
    return NextResponse.json({ error: 'Failed to fetch courts' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { court_id } = await request.json();

    if (!court_id) {
      return NextResponse.json({ error: 'court_id is required' }, { status: 400 });
    }

    await addCourtToTournament(parseInt(id), court_id);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('POST tournament court error:', error);
    return NextResponse.json({ error: 'Failed to add court' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { court_id } = await request.json();

    if (!court_id) {
      return NextResponse.json({ error: 'court_id is required' }, { status: 400 });
    }

    await removeCourtFromTournament(parseInt(id), court_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE tournament court error:', error);
    return NextResponse.json({ error: 'Failed to remove court' }, { status: 500 });
  }
}
