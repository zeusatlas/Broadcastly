// "5 Nov, 17:02" in the device locale; the API sends ISO timestamps.
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}
