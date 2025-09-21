export const runtime = "edge";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import type { Preferences } from "@/lib/preferences/types";
import { sanitizePreferences, mergePreferences as mergePrefHelpers } from "@/lib/preferences/utils";
import { getUserById, updateUser } from "@/lib/storage/user";

export async function GET() {
  const session = await getSession();
  if (!session?.uid) {
    return NextResponse.json({ preferences: null }, { status: 200 });
  }
  const user = await getUserById(session.uid);
  if (!user) {
    return NextResponse.json({ preferences: null }, { status: 200 });
  }
  return NextResponse.json({ preferences: sanitizePreferences(user.preferences) }, { status: 200 });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.uid) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const payload = typeof body?.preferences === "object" ? (body.preferences as Partial<Preferences>) : {};
  const user = await getUserById(session.uid);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const merged = mergePrefHelpers(user.preferences, payload);
  const updated = await updateUser(session.uid, { preferences: merged });
  return NextResponse.json({ preferences: updated?.preferences ?? merged }, { status: 200 });
}
