import { getCurrentTimeInTallinn, getTodayInTallinn } from '../src/lib/timezone';
import { resolveEarliestUpcomingBookableSlot } from '../src/lib/booking-engine/availability/earliest-slot';
import { resolveSlotStatus } from '../src/lib/booking-engine/availability/resolve-slot-status';
import { calculateBookingPricing, BOOKING_DEPOSIT_EUR } from '../src/lib/booking-engine/pricing/calculate-booking-pricing';
import type { EngineTimeSlot } from '../src/lib/booking-engine/types';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function addDaysTallinnYmd(ymd: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) throw new Error(`Invalid ymd: ${ymd}`);
  const [y, m, d] = ymd.split('-').map((x) => Number(x));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Tallinn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dt);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function buildSlot(partial: Partial<EngineTimeSlot>): EngineTimeSlot {
  // Only fields used by the tests + functions under test are required at runtime.
  return {
    id: partial.id ?? 'slot',
    date: partial.date ?? '2000-01-01',
    time: partial.time ?? '09:00',
    available: partial.available ?? true,
    status: partial.status ?? 'free',
    capacity: partial.capacity ?? 1,
    count: partial.count ?? 1,
    isPopular: partial.isPopular ?? false,
    isFastest: partial.isFastest ?? false,
    isSos: partial.isSos ?? false,
    sosSurcharge: partial.sosSurcharge,
    sosLabel: partial.sosLabel ?? null,
    createdAt: partial.createdAt,
    updatedAt: partial.updatedAt,
  };
}

async function run() {
  // ---------------------------------------------------------------------------
  // Pricing engine self-test (pure function)
  // ---------------------------------------------------------------------------
  const totals = calculateBookingPricing({
    service: { price: 35, duration: 45 },
    slot: buildSlot({ isSos: true, status: 'sos', sosSurcharge: 10 }),
    addOns: [
      { price: 5, duration: 10 },
      { price: 7, duration: 15 },
    ],
  });

  assert(totals.depositAmount === BOOKING_DEPOSIT_EUR, 'Deposit should match constant');
  assert(totals.totalPrice === 57, `Expected totalPrice=57, got ${totals.totalPrice}`);
  assert(totals.totalDuration === 70, `Expected totalDuration=70, got ${totals.totalDuration}`);
  assert(totals.remainingAmount === 47, `Expected remainingAmount=47, got ${totals.remainingAmount}`);

  // ---------------------------------------------------------------------------
  // Availability slot-status priority self-test
  // ---------------------------------------------------------------------------
  const priorityStatus = resolveSlotStatus({
    hasActiveBooking: true,
    slotAvailable: false,
    isSos: true,
  });
  assert(priorityStatus === 'booked', `Expected priorityStatus=booked, got ${priorityStatus}`);

  // ---------------------------------------------------------------------------
  // Earliest upcoming selection self-test (deterministic)
  // ---------------------------------------------------------------------------
  const today = getTodayInTallinn();
  const tomorrow = addDaysTallinnYmd(today, 1);
  const currentTime = getCurrentTimeInTallinn();
  const nowM = timeToMinutes(currentTime);
  const tPast = minutesToTime(Math.max(0, nowM - 30));
  const tNext = minutesToTime(Math.min(23 * 60 + 50, nowM + 10));

  const slots: EngineTimeSlot[] = [
    // Past today (should be ignored)
    buildSlot({ id: 'past', date: today, time: tPast, status: 'free', available: true }),

    // Earliest tomorrow free slot
    buildSlot({ id: 'tomorrow-early', date: tomorrow, time: '09:00', status: 'free', available: true }),
    // Tomorrow booked slot (should be ignored)
    buildSlot({ id: 'tomorrow-booked', date: tomorrow, time: '10:00', status: 'booked', available: false }),
    // Later tomorrow free slot
    buildSlot({ id: 'tomorrow-late', date: tomorrow, time: '12:30', status: 'free', available: true }),

    // Near-now slot today (depends on currentTime; should be after past and before tomorrow)
    buildSlot({ id: 'today-next', date: today, time: tNext, status: 'free', available: true }),
  ];

  const earliest = resolveEarliestUpcomingBookableSlot(slots);
  assert(earliest !== null, 'Expected an earliest slot');
  if (timeToMinutes(tNext) > nowM) {
    assert(
      earliest!.date === today && earliest!.time === tNext,
      `Expected earliest=${today} ${tNext}, got ${earliest!.date} ${earliest!.time}`
    );
  } else {
    assert(
      earliest!.date === tomorrow && earliest!.time === '09:00',
      `Expected earliest=${tomorrow} 09:00, got ${earliest!.date} ${earliest!.time}`
    );
  }

  console.log('booking-engine-self-test: All tests passed');
}

run().catch((e) => {
  console.error('booking-engine-self-test failed:', e);
  process.exit(1);
});

