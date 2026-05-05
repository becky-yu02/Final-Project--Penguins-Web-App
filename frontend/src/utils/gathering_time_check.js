// Simple script to determine if a gathering is currently happening or upcoming.
// Separated because it's used in multiple places.

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export function isCurrentOrUpcoming(g) {
  const now = Date.now();
  const start = new Date(g.datetime_start).getTime();
  if (g.datetime_end) {
    return new Date(g.datetime_end).getTime() > now;
  }
  return start + TWELVE_HOURS_MS > now;
}
