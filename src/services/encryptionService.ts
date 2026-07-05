const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

async function getEncryptionKey(): Promise<CryptoKey> {
  const keyMaterial = import.meta.env.VITE_SUPABASE_ANON_KEY || 'default-key-material';

  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial);

  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);

  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptPassword(password: string): Promise<string> {
  if (!password) return '';

  try {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(password);

    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv
      },
      key,
      data
    );

    const encryptedArray = new Uint8Array(iv.length + encryptedData.byteLength);
    encryptedArray.set(iv, 0);
    encryptedArray.set(new Uint8Array(encryptedData), iv.length);

    return arrayBufferToBase64(encryptedArray.buffer);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt password');
  }
}

export async function decryptPassword(encryptedPassword: string): Promise<string> {
  if (!encryptedPassword) return '';

  if (!isBase64(encryptedPassword)) {
    return encryptedPassword;
  }

  try {
    const key = await getEncryptionKey();
    const encryptedArray = new Uint8Array(base64ToArrayBuffer(encryptedPassword));

    if (encryptedArray.length < 13) {
      return encryptedPassword;
    }

    const iv = encryptedArray.slice(0, 12);
    const data = encryptedArray.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv
      },
      key,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedPassword;
  }
}

function isBase64(str: string): boolean {
  if (!str || str.length === 0) return false;

  const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!base64Regex.test(str)) return false;

  try {
    const decoded = atob(str);
    return decoded.length > 12;
  } catch {
    return false;
  }
}

export function checkIfEncrypted(value: string): boolean {
  return isBase64(value);
}

export async function isEncrypted(value: string): Promise<boolean> {
  return isBase64(value);
}
