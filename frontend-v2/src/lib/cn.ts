import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Ghép class Tailwind, xử lý xung đột utility. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
