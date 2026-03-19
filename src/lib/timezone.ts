/**
 * Timezone utilities for Nailify
 * All date/time handling uses Europe/Tallinn (EET/EEST) timezone
 */

export const TALLINN_TIMEZONE = 'Europe/Tallinn';

/**
 * Get today's date in YYYY-MM-DD format in Europe/Tallinn timezone
 */
export function getTodayInTallinn(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TALLINN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

/**
 * Get tomorrow's date in YYYY-MM-DD format in Europe/Tallinn timezone
 */
export function getTomorrowInTallinn(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TALLINN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(tomorrow);
}

/**
 * Get current time in Europe/Tallinn timezone as HH:MM
 */
export function getCurrentTimeInTallinn(): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TALLINN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return formatter.format(new Date());
}

/**
 * Get current datetime in Europe/Tallinn timezone
 */
export function getNowInTallinn(): Date {
  // Create a date that represents "now" in Tallinn
  // We use the offset to adjust
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TALLINN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Parse the formatted string back to a Date object
  // This gives us a date that's correctly adjusted for Tallinn
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
  
  return new Date(
    parseInt(getPart('year')),
    parseInt(getPart('month')) - 1,
    parseInt(getPart('day')),
    parseInt(getPart('hour')),
    parseInt(getPart('minute')),
    parseInt(getPart('second'))
  );
}

/**
 * Check if a slot date/time is in the past according to Europe/Tallinn timezone
 * @param date - slot date in YYYY-MM-DD format
 * @param time - slot time in HH:MM format
 * @returns true if the slot is in the past
 */
export function isSlotInPast(date: string, time: string): boolean {
  const now = getNowInTallinn();
  const [hours, minutes] = time.split(':').map(Number);
  
  const slotDate = new Date(`${date}T00:00:00`);
  slotDate.setHours(hours, minutes, 0, 0);
  
  return slotDate < now;
}

/**
 * Format a date for display in the booking widget
 * @returns "today", "tomorrow", or formatted date
 */
export function formatSlotDayForWidget(date: string, locale: 'et' | 'en' = 'et'): string {
  const todayTallinn = getTodayInTallinn();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TALLINN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const tomorrowTallinn = formatter.format(tomorrowDate);
  
  if (date === todayTallinn) {
    return locale === 'en' ? 'today' : 'täna';
  }
  if (date === tomorrowTallinn) {
    return locale === 'en' ? 'tomorrow' : 'homme';
  }
  
  // Format as short date
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString(locale === 'en' ? 'en-GB' : 'et-EE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

/**
 * Get the current hour in Tallinn (0-23)
 */
export function getCurrentHourInTallinn(): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TALLINN_TIMEZONE,
    hour: '2-digit',
    hour12: false
  });
  return parseInt(formatter.format(new Date()));
}
