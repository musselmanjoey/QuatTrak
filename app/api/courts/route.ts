import { NextRequest, NextResponse } from 'next/server';
import { getAllCourts, createCourt } from '@/lib/courtService';

export async function GET() {
  try {
    const courts = await getAllCourts();
    return NextResponse.json(courts);
  } catch (error) {
    console.error('GET /api/courts error:', error);
    return NextResponse.json({ error: 'Failed to get courts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, slug } = await request.json();

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json({ error: 'Slug must be lowercase letters, numbers, and hyphens only' }, { status: 400 });
    }

    const court = await createCourt(name, slug);
    return NextResponse.json(court, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({ error: 'A court with that slug already exists' }, { status: 409 });
    }
    console.error('POST /api/courts error:', error);
    return NextResponse.json({ error: 'Failed to create court' }, { status: 500 });
  }
}
