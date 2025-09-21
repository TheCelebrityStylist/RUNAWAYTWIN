import { kvGet, kvSet } from "./kv";
import type { ChatHistoryEnvelope, ChatMessageRecord } from "@/lib/chat/types";

const HISTORY_LIMIT = 60;

function historyKey(userId: string) {
  return `history:${userId}`;
}

export async function getHistory(userId: string): Promise<ChatHistoryEnvelope> {
  const stored = await kvGet<ChatHistoryEnvelope>(historyKey(userId));
  if (stored?.messages) {
    return stored;
  }
  return { messages: [], updatedAt: "" };
}

export async function saveHistory(userId: string, messages: ChatMessageRecord[]) {
  const trimmed = messages.slice(-HISTORY_LIMIT);
  const envelope: ChatHistoryEnvelope = {
    messages: trimmed,
    updatedAt: new Date().toISOString(),
  };
  await kvSet(historyKey(userId), envelope);
  return envelope;
}

export async function appendHistory(userId: string, next: ChatMessageRecord[]) {
  const current = await getHistory(userId);
  const merged = [...current.messages, ...next];
  return saveHistory(userId, merged);
}
