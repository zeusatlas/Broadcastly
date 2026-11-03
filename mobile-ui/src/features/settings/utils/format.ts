// Dates of birth are calendar dates ('1984-03-12'): read and shown in UTC so no timezone shifts them.
export function formatCalendarDate(value: string): string {
  return new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// '2026-08-14T…' → '14 Aug 2026'.
export const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
