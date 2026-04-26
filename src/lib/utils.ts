import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from '../components/ui/Toast';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function notifyError(message: string, context?: string) {
  toast.error(message);
}
