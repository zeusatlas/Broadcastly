export type SchedulePreset = 'now' | 'in_1_hour' | 'this_evening' | 'tomorrow_morning';

const EVENING_HOUR = 18;
const MORNING_HOUR = 9;

// "This evening" is offered only while 6pm is at least an hour away.
export function availablePresets(now = new Date()): SchedulePreset[] {
  const presets: SchedulePreset[] = ['now', 'in_1_hour'];
  if (now.getHours() < EVENING_HOUR - 1) presets.push('this_evening');
  presets.push('tomorrow_morning');
  return presets;
}

export const PRESET_LABELS: Record<SchedulePreset, string> = {
  now: 'Now',
  in_1_hour: 'In 1 hour',
  this_evening: 'This evening, 6pm',
  tomorrow_morning: 'Tomorrow, 9am',
};

// Worked out when the sender confirms, so "in 1 hour" means an hour from that tap. null = send now.
export function scheduledAtFor(preset: SchedulePreset, now = new Date()): Date | null {
  const at = new Date(now);
  switch (preset) {
    case 'now':
      return null;
    case 'in_1_hour':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case 'this_evening':
      at.setHours(EVENING_HOUR, 0, 0, 0);
      return at;
    case 'tomorrow_morning':
      at.setDate(at.getDate() + 1);
      at.setHours(MORNING_HOUR, 0, 0, 0);
      return at;
  }
}

export function describeSchedule(at: Date | null): string {
  if (!at) return 'Sends as soon as you confirm';
  return `Sends ${at.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`;
}
