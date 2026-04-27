/**
 * Utilitário de storage que respeita o consentimento do usuário (LGPD).
 */
export const storageService = {
  getConsent: (): boolean => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('cookie_consent') === 'accepted';
  },

  setItem: (key: string, value: string, force: boolean = false) => {
    if (typeof window === 'undefined') return;
    // A decisão do próprio consentimento deve ser salva
    if (key === 'cookie_consent' || force || storageService.getConsent()) {
      localStorage.setItem(key, value);
    }
  },

  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },

  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }
};
