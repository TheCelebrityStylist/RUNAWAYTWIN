// FILE: lib/sse/reader.ts
export type SSEEvent =
  | { type: "ready" }
  | { type: "assistant_draft_delta"; data: string }
  | { type: "assistant_draft_done" }
  | { type: "tool_call"; data: any }
  | { type: "tool_result"; data: any }
  | { type: "assistant_final"; data: string }
  | { type: "error"; data: string }
  | { type: "done" }
  | { type: "ping" };

export function encodeSSE(event: SSEEvent): string {
  const name = event.type;
  const payload = "data" in event && event.data !== undefined ? JSON.stringify(event.data) : "";
  const lines = [`event: ${name}`];
  if (payload) lines.push(`data: ${payload}`);
  lines.push("", "");
  return lines.join("\n");
}
