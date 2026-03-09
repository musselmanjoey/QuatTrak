import { NextResponse } from 'next/server';
import { getCourtsOverview } from '@/lib/courtService';

export async function GET() {
  try {
    const overview = await getCourtsOverview();
    return NextResponse.json(overview);
  } catch (error) {
    console.error('GET /api/courts/overview error:', error);
    return NextResponse.json({ error: 'Failed to get courts overview' }, { status: 500 });
  }
}
