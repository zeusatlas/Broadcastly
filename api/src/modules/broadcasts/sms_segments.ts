import { RECIPIENT_FIELD } from './broadcasts_types';

const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_EXTENDED = '^{}\\[~]|€\f';
// Room left for {first_name} when estimating: covers almost every name, so the hold rarely falls short.
const ESTIMATED_NAME = 'X'.repeat(20);

export interface SmsEstimate {
  encoding: 'GSM-7' | 'Unicode';
  characters: number;
  segments: number;
}

// GSM-7 vs UCS-2 detection and billable segment count (FR-SMS-06). Source of truth for cost.
export function estimateSmsSegments(message: string): SmsEstimate {
  let gsmCharacters = 0;
  let isGsm = true;

  for (const character of message) {
    if (GSM_BASIC.includes(character)) gsmCharacters += 1;
    else if (GSM_EXTENDED.includes(character)) gsmCharacters += 2;
    else {
      isGsm = false;
      break;
    }
  }

  // UCS-2 counts UTF-16 code units, so an emoji takes two.
  const characters = isGsm ? gsmCharacters : message.length;
  const single = isGsm ? 160 : 70;
  const multi = isGsm ? 153 : 67;
  const segments = characters === 0 ? 0 : characters <= single ? 1 : Math.ceil(characters / multi);
  return { encoding: isGsm ? 'GSM-7' : 'Unicode', characters, segments };
}

export function personalise(message: string, firstName: string | null): string {
  return message.replaceAll(RECIPIENT_FIELD, firstName?.trim() || 'Member');
}

export function estimateBroadcastSegments(message: string): SmsEstimate {
  return estimateSmsSegments(message.replaceAll(RECIPIENT_FIELD, ESTIMATED_NAME));
}

// Placeholders other than {first_name} must be filled in by the sender before it goes out.
export function unfilledFields(message: string): string[] {
  return [...new Set(message.match(/\{[a-z_]+\}/g) ?? [])].filter(
    (field) => field !== RECIPIENT_FIELD,
  );
}
