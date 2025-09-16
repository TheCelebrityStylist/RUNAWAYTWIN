export type SSEEvent = {
  event: string;
  data: any;
};

function parseData(line: string): any {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

export function consumeSSEChunk(
  chunk: string,
  carry: string,
  onEvent: (evt: SSEEvent) => void
): string {
  let buffer = carry + chunk;
  let separatorIndex = buffer.indexOf("\n\n");

  while (separatorIndex !== -1) {
    const block = buffer.slice(0, separatorIndex);
    buffer = buffer.slice(separatorIndex + 2);
    const lines = block.split(/\n/);
    let eventName = "message";
    const dataParts: string[] = [];

    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line) continue;
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataParts.push(line.slice(5));
      }
    }

    if (dataParts.length) {
      const payload = parseData(dataParts.join("\n"));
      onEvent({ event: eventName, data: payload });
    }

    separatorIndex = buffer.indexOf("\n\n");
  }

  return buffer;
}
