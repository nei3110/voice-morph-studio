// Simple, robust client-side access control with SHA-256 password hashing and persistent session

const STORAGE_KEY = 'vms_auth_token_v1';
const PASSCODE_STORAGE_KEY = 'vms_custom_passcode_hash';

// Default initial passcode hash for "morph2026"
// SHA-256("morph2026") = 7a827464e52627eec1287c2fbfe37494f4c2643a60a7e671b7b0553bb3feeb8f
const DEFAULT_HASH = '7a827464e52627eec1287c2fbfe37494f4c2643a60a7e671b7b0553bb3feeb8f';

async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function isUserAuthenticated(): boolean {
  try {
    const token = localStorage.getItem(STORAGE_KEY);
    return token === 'authenticated';
  } catch {
    return false;
  }
}

export async function verifyPasscode(input: string): Promise<boolean> {
  if (!input) return false;
  const hash = await sha256(input.trim());
  const storedHash = localStorage.getItem(PASSCODE_STORAGE_KEY) || DEFAULT_HASH;
  if (hash === storedHash) {
    localStorage.setItem(STORAGE_KEY, 'authenticated');
    return true;
  }
  return false;
}

export async function setCustomPasscode(newPasscode: string): Promise<void> {
  if (!newPasscode || newPasscode.length < 4) {
    throw new Error('パスコードは4文字以上で設定してください');
  }
  const hash = await sha256(newPasscode.trim());
  localStorage.setItem(PASSCODE_STORAGE_KEY, hash);
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEY);
}
