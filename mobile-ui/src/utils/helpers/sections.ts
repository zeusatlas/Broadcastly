export interface ListSection<T> {
  title: string;
  data: T[];
}

// Server pages arrive already ordered, so sections are runs of equal titles; a title that comes back
// later (out of order) starts a new section instead of moving rows around.
export function groupIntoSections<T>(items: readonly T[], titleOf: (item: T) => string) {
  const sections: ListSection<T>[] = [];
  for (const item of items) {
    const title = titleOf(item);
    const last = sections.at(-1);
    if (last?.title === title) last.data.push(item);
    else sections.push({ title, data: [item] });
  }
  return sections;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function dateSectionTitle(value: string | null | undefined, now = new Date()) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (day === today) return 'Today';
  if (day === today - DAY_MS) return 'Yesterday';
  if (day > today - 7 * DAY_MS && day < today) return 'This week';
  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
    return 'Earlier this month';
  }
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function letterSectionTitle(name: string) {
  const letter = name.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : '#';
}
