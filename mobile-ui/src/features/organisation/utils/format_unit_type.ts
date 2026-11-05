export const formatUnitType = (value: string) =>
  value.replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase());
