const encoder = new TextEncoder();

function base64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(padded);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function randomSalt(size = 16): string {
  const raw = crypto.getRandomValues(new Uint8Array(size));
  return base64Url(raw.buffer);
}

export async function hashPassword(password: string, salt?: string) {
  const useSalt = salt || randomSalt();
  const data = encoder.encode(`${useSalt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return { salt: useSalt, hash: base64Url(digest) };
}

export async function verifyPassword(password: string, salt: string, hash: string) {
  const { hash: nextHash } = await hashPassword(password, salt);
  const a = fromBase64Url(hash);
  const b = fromBase64Url(nextHash);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
