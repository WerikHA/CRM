import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

let toastIdCounter = 0;
type ToastFunction = (message: string, options?: Omit<ToastOptions, 'message'>) => void;

class ToastService {
  private listeners: ((toasts: ToastItem[]) => void)[] = [];
  private toasts: ToastItem[] = [];

  subscribe(listener: (toasts: ToastItem[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.toasts));
  }

  show(options: ToastOptions) {
    const id = (++toastIdCounter).toString();
    const newToast: ToastItem = { ...options, id, type: options.type || 'info', duration: options.duration || 4000 };
    this.toasts = [...this.toasts, newToast];
    this.notify();

    if (newToast.duration) {
      setTimeout(() => this.remove(id), newToast.duration);
    }
  }

  remove(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }

  success(message: string, duration?: number) {
    this.show({ message, type: 'success', duration });
  }

  error(message: string, duration?: number) {
    this.show({ message, type: 'error', duration });
  }

  info(message: string, duration?: number) {
    this.show({ message, type: 'info', duration });
  }
}

export const toast = new ToastService();

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe(setToasts);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`flex items-start gap-3 p-4 rounded-xl shadow-xl min-w-[300px] border max-w-md backdrop-blur-md ${
              t.type === 'success' ? 'bg-emerald-50/90 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100' :
              t.type === 'error' ? 'bg-rose-50/90 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100' :
              'bg-blue-50/90 dark:bg-blue-950/90 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100'
            }`}
          >
            {t.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />}
            
            <p className="text-sm font-medium leading-relaxed flex-1">{t.message}</p>
            
            <button 
              onClick={() => toast.remove(t.id)} 
              className="p-1 shrink-0 rounded-lg opacity-50 hover:opacity-100 transition-opacity hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
