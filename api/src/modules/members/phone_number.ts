// Ghanaian numbers in E.164 (FR-MEM-05): +233 followed by a 9-digit national number.
// Accepts the common ways people type them: 024 123 4567, 24-123-4567, 233241234567, +233 24…
const NATIONAL_NUMBER = /^[235]\d{8}$/;

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

// For messages shown to the member signing in: enough to recognise their number, not to harvest it.
export function maskPhone(e164: string): string {
  return `${e164.slice(0, 4)} •• ••• ${e164.slice(-4)}`;
}
