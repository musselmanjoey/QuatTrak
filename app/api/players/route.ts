import { NextRequest, NextResponse } from 'next/server';
import { searchPlayers, createPlayer } from '@/lib/playerService';

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get('search') || undefined;
    const players = await searchPlayers(search);
    return NextResponse.json(players);
  } catch (error) {
    console.error('GET /api/players error:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const player = await createPlayer(name);
    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes('duplicate') || message.includes('unique')) {
      return NextResponse.json({ error: 'A player with that name already exists' }, { status: 409 });
    }
    console.error('POST /api/players error:', error);
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
  }
}
