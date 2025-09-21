export const runtime = "edge";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getHistory } from "@/lib/storage/history";

export async function GET() {
  const session = await getSession();
  if (!session?.uid) {
    return NextResponse.json({ messages: [], updatedAt: null }, { status: 200 });
  }
  const history = await getHistory(session.uid);
  return NextResponse.json(history, { status: 200 });
}
