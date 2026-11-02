import type { SegmentEstimate } from '../types';

// Estimate only (FR-SMS-06); the server-side estimate is what gets charged.
const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
// Extension characters cost two septets each (escape + char).
const GSM_EXTENDED = '^{}\\[~]|€\f';

const LIMITS = {
  'GSM-7': { single: 160, multi: 153 },
  Unicode: { single: 70, multi: 67 },
} as const;

export function estimateSegments(text: string): SegmentEstimate {
  let septets = 0;
  let isGsm = true;

  for (const char of text) {
    if (GSM_BASIC.includes(char)) septets += 1;
    else if (GSM_EXTENDED.includes(char)) septets += 2;
    else {
      isGsm = false;
      break;
    }
  }

  const encoding = isGsm ? 'GSM-7' : 'Unicode';
  // UTF-16 code units: emoji and other astral characters take two.
  const characters = isGsm ? septets : text.length;
  const { single, multi } = LIMITS[encoding];

  if (characters === 0) return { encoding, characters, segments: 0, remaining: single };
  if (characters <= single) {
    return { encoding, characters, segments: 1, remaining: single - characters };
  }

  const segments = Math.ceil(characters / multi);
  return { encoding, characters, segments, remaining: segments * multi - characters };
}
