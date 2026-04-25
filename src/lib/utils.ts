import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function notifyError(message: string, context?: string) {
  if ((window as any).reportAppError) {
    (window as any).reportAppError(message, context);
  } else {
    alert(message);
  }
}
