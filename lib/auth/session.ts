import { cookies } from "next/headers";

const encoder = new TextEncoder();
const SESSION_COOKIE = "rt_session";

function base64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncode(data: string): string {
  return base64Url(encoder.encode(data));
}

function fromBase64Url(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  if (view.byteOffset === 0 && view.byteLength === view.buffer.byteLength && view.buffer instanceof ArrayBuffer) {
    return view.buffer;
  }
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy.buffer;
}

async function getKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET missing");
  }
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(userId: string, ttlDays = 60) {
  const payload = {
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60,
    ver: 1,
  };
  const data = base64UrlEncode(JSON.stringify(payload));
  const key = await getKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const sig = base64Url(signature);
  return `${data}.${sig}`;
}

export async function parseSessionToken(token?: string | null) {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const key = await getKey();
  const signatureBytes = fromBase64Url(sig);
  const isValid = await crypto.subtle.verify("HMAC", key, toArrayBuffer(signatureBytes), encoder.encode(data));
  if (!isValid) return null;
  try {
    const json = JSON.parse(new TextDecoder().decode(fromBase64Url(data)));
    if (!json?.uid || !json?.exp) return null;
    if (json.exp < Math.floor(Date.now() / 1000)) return null;
    return json as { uid: string; exp: number; ver: number };
  } catch {
    return null;
  }
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export async function getSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const parsed = await parseSessionToken(token || "");
  return parsed;
}

export function createSessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: true,
    path: "/",
    sameSite: "lax" as const,
    maxAge: 60 * 24 * 60 * 60,
  };
}

export function setSessionCookie(token: string) {
  cookies().set(createSessionCookie(token));
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}
