export const greetingFor = (hour: number) =>
  hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
