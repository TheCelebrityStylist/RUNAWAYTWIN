export const runtime = "edge";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserById, serializeUser } from "@/lib/storage/user";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.uid) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    const user = await getUserById(session.uid);
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    return NextResponse.json({ user: serializeUser(user) }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ user: null, error: err?.message || "session error" }, { status: 200 });
  }
}
