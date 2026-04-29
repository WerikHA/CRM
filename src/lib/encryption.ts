import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || 'amplifica-crm-default-key-change-it-in-env';

export function encrypt(text: string): string {
  if (!text) return text;
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ciphertext;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.error('[ENCRYPTION] Decryption failed, returning original text (might be plain text):', e);
    return ciphertext;
  }
}

export function encryptObject(obj: any): string {
  if (!obj) return '';
  return encrypt(JSON.stringify(obj));
}

export function decryptObject(ciphertext: string): any {
  if (!ciphertext) return null;
  const decrypted = decrypt(ciphertext);
  try {
    return JSON.parse(decrypted);
  } catch (e) {
    return null;
  }
}
