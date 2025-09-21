export const runtime = "edge";

import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/hash";
import { createSessionToken, createSessionCookie } from "@/lib/auth/session";
import { getUserByEmail, serializeUser } from "@/lib/storage/user";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const emailRaw = typeof payload?.email === "string" ? payload.email : "";
  const password = typeof payload?.password === "string" ? payload.password : "";

  if (!emailRaw || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const user = await getUserByEmail(normalizeEmail(emailRaw));
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const valid = await verifyPassword(password, user.salt, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = await createSessionToken(user.id);
  const response = NextResponse.json({ user: serializeUser(user) }, { status: 200 });
  response.cookies.set(createSessionCookie(token));
  return response;
}
