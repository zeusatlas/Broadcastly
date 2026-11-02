import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// twMerge drops earlier classes the later ones override, so callers can override component defaults.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
