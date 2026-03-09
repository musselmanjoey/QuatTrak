import { NextRequest, NextResponse } from 'next/server';
import { getCourtBySlug } from '@/lib/courtService';
import { findOrCreateTodaySession } from '@/lib/sessionService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const court = await getCourtBySlug(slug);

    if (!court) {
      return NextResponse.json({ error: 'Court not found' }, { status: 404 });
    }

    const session = await findOrCreateTodaySession(court.id);
    return NextResponse.json(session);
  } catch (error) {
    console.error('GET /api/courts/[slug]/session error:', error);
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
}
