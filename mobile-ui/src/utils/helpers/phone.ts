// Same rules as server/src/modules/members/phone_number.ts, for instant form feedback only:
// the backend normalises again and stays the authority (FR-MEM-05).
const NATIONAL_NUMBER = /^[235]\d{8}$/;

/** '0559286073', '+233 55 928 6073' or '233559286073' → '+233559286073'; null if invalid. */
export function normaliseGhanaPhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-().]/g, '');
  let national: string;

  if (digits.startsWith('+233')) national = digits.slice(4);
  else if (digits.startsWith('00233')) national = digits.slice(5);
  else if (digits.startsWith('233') && digits.length === 12) national = digits.slice(3);
  else if (digits.startsWith('0')) national = digits.slice(1);
  else national = digits;

  return NATIONAL_NUMBER.test(national) ? `+233${national}` : null;
}

/** '+233241234567' → '+233 24 123 4567', for display. Other input comes back unchanged. */
export function formatGhanaPhone(e164: string): string {
  const match = /^\+233(\d{2})(\d{3})(\d{4})$/.exec(e164);
  return match ? `+233 ${match[1]} ${match[2]} ${match[3]}` : e164;
}
