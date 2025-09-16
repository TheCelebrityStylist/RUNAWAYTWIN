import { describe, it, expect } from "vitest";
import { consumeSSEChunk } from "@/lib/sse/reader";

describe("consumeSSEChunk", () => {
  it("parses basic SSE events across chunks", () => {
    const received: Array<{ event: string; data: any }> = [];
    const handler = (evt: { event: string; data: any }) => received.push(evt);

    let carry = "";
    carry = consumeSSEChunk("event: ready\ndata: {\"ok\":true}\n\n", carry, handler);
    expect(received).toHaveLength(1);
    expect(received[0].event).toBe("ready");
    expect(received[0].data).toEqual({ ok: true });

    const chunkA = "event: assistant_draft_delta\n";
    const chunkB = "data: {\"text\":\"Hello\"}\n\n";
    carry = consumeSSEChunk(chunkA, carry, handler);
    carry = consumeSSEChunk(chunkB, carry, handler);
    expect(received[1]).toEqual({ event: "assistant_draft_delta", data: { text: "Hello" } });

    const split = "event: assistant_final\n" + "data: {\"text\":\"Done\"}\n";
    carry = consumeSSEChunk(split.slice(0, 20), carry, handler);
    carry = consumeSSEChunk(split.slice(20) + "\n", carry, handler);
    expect(received[2]).toEqual({ event: "assistant_final", data: { text: "Done" } });

    expect(carry).toBe("");
  });
});
