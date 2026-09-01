import { randomUUID } from 'crypto';

// Single-use exchange codes so the OAuth redirect never puts the real JWT in
// the URL (browser history / server logs / Referer headers). The frontend
// receives an opaque code and immediately trades it for the token via POST.
//
// In-memory and single-instance only — swap for Redis (or similar) once the
// backend runs as more than one process.
interface Entry {
  token: string;
  expiresAt: number;
}

const store = new Map<string, Entry>();
const TTL_MS = 60_000;

export function createAuthCode(token: string): string {
  const code = randomUUID();
  store.set(code, { token, expiresAt: Date.now() + TTL_MS });
  return code;
}

export function consumeAuthCode(code: string): string | null {
  const entry = store.get(code);
  store.delete(code);
  if (!entry || entry.expiresAt < Date.now()) {
    return null;
  }
  return entry.token;
}

setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of store) {
    if (entry.expiresAt < now) store.delete(code);
  }
}, TTL_MS).unref();
