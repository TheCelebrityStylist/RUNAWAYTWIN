export const runtime = "edge";

import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/hash";
import { createSessionToken, createSessionCookie } from "@/lib/auth/session";
import { DEFAULT_PREFERENCES } from "@/lib/preferences/types";
import { getUserByEmail, saveUser, serializeUser, type UserRecord } from "@/lib/storage/user";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const emailRaw = typeof payload?.email === "string" ? payload.email : "";
  const password = typeof payload?.password === "string" ? payload.password : "";

  if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const email = normalizeEmail(emailRaw);
  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "Account already exists" }, { status: 409 });
  }

  const { hash, salt } = await hashPassword(password);
  const now = new Date().toISOString();
  const record: UserRecord = {
    id: crypto.randomUUID(),
    email,
    passwordHash: hash,
    salt,
    plan: "free",
    lookCredits: 0,
    subscriptionActive: false,
    subscriptionRenewsAt: null,
    freeLookUsed: false,
    preferences: DEFAULT_PREFERENCES,
    createdAt: now,
    updatedAt: now,
  };

  await saveUser(record);

  const token = await createSessionToken(record.id);
  const response = NextResponse.json({ user: serializeUser(record) }, { status: 201 });
  response.cookies.set(createSessionCookie(token));
  return response;
}
