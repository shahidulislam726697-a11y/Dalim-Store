/**
 * Date and Time utilities configured for Asia/Dhaka (UTC+6)
 */

export const DHAKA_TIMEZONE = 'Asia/Dhaka';

/**
 * Returns current timestamp in ISO format
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Dhaka timezone
 */
export function getDhakaToday(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DHAKA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Formats a date string or Date object into 'DD MMM YYYY, hh:mm A' in Asia/Dhaka
 */
export function formatDhakaDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';

  const dateParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DHAKA_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);

  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: DHAKA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);

  return `${dateParts}, ${timeParts}`;
}

/**
 * Returns Dhaka start-of-day and end-of-day ISO strings for a given YYYY-MM-DD
 */
export function getDhakaDateBounds(dateStr: string): { startIso: string; endIso: string } {
  // Asia/Dhaka is UTC+6 without daylight savings
  const startIso = `${dateStr}T00:00:00+06:00`;
  const endIso = `${dateStr}T23:59:59.999+06:00`;
  return {
    startIso: new Date(startIso).toISOString(),
    endIso: new Date(endIso).toISOString(),
  };
}

/**
 * Formats invoice date-part string like YYYYMMDD
 */
export function getInvoiceDateCode(): string {
  const today = getDhakaToday(); // YYYY-MM-DD
  return today.replace(/-/g, '');
}
