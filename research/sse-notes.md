# SSE & Streaming Notes

## Vercel Edge Streaming
- Vercel's Edge streaming guide explains that the platform supports chunked responses using the Web Streams API, highlights chunk handling/backpressure, and lists AI applications as a primary use case. (Source: https://vercel.com/docs/functions/edge-functions/streaming)

## SSE Format (MDN)
- Servers must use `Content-Type: text/event-stream` and send events as text blocks terminated by a blank line.
- Keep-alive comments (`: comment`) can prevent connections from timing out, and fields like `event`, `data`, `id`, and `retry` define message behaviour.
- Examples show periodic events, custom event names, and reconnection guidance.

Source: https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/server-sent_events/using_server-sent_events/index.md
