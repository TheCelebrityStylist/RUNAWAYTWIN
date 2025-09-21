export type ChatRole = "user" | "assistant" | "tool";

export type ChatMessageRecord = {
  id: string;
  role: ChatRole;
  content: string;
  meta?: Record<string, unknown> | null;
  createdAt: string;
};

export type ChatHistoryEnvelope = {
  messages: ChatMessageRecord[];
  updatedAt: string;
};

export const EMPTY_HISTORY: ChatHistoryEnvelope = {
  messages: [],
  updatedAt: "",
};

export function normalizeMessage(input: {
  id?: string;
  role: ChatRole;
  content: string;
  meta?: Record<string, unknown> | null;
}): ChatMessageRecord {
  return {
    id: input.id || crypto.randomUUID(),
    role: input.role,
    content: input.content,
    meta: input.meta ?? null,
    createdAt: new Date().toISOString(),
  };
}
