export interface NextAvailableSlotLite {
  id: string;
  date: string;
  time: string;
}

let cachedSlot: NextAvailableSlotLite | null = null;
let cachedAtMs = 0;
let inFlight: Promise<NextAvailableSlotLite | null> | null = null;

const CACHE_TTL_MS = 60_000;

export async function getNextAvailableSlotClient(): Promise<NextAvailableSlotLite | null> {
  const now = Date.now();
  if (cachedAtMs > 0 && now - cachedAtMs <= CACHE_TTL_MS) {
    return cachedSlot;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    try {
      const response = await fetch('/api/slots/next-available', { cache: 'default' });
      if (!response.ok) throw new Error('Failed to load next available slot');
      const data = (await response.json()) as { slot?: NextAvailableSlotLite | null };
      cachedSlot = data.slot ?? null;
      cachedAtMs = Date.now();
      return cachedSlot;
    } catch {
      // Keep UX resilient: callers can still route to /book without slot prefill.
      cachedSlot = null;
      cachedAtMs = Date.now();
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
