import { NextResponse } from 'next/server';
import { ensureSlotsTable, listUpcomingAvailableSlots } from '@/lib/slots';

export async function GET() {
  try {
    await ensureSlotsTable();
    const [slot] = await listUpcomingAvailableSlots(1);

    return NextResponse.json(
      {
        ok: true,
        slot: slot
          ? {
              id: slot.id,
              date: slot.date,
              time: slot.time,
            }
          : null,
      },
      {
        headers: {
          // Short-lived edge/browser cache keeps hero fast while staying accurate.
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('GET /api/slots/next-available error:', error);
    return NextResponse.json({ error: 'Failed to load next available slot' }, { status: 500 });
  }
}
