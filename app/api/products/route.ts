// FILE: app/api/products/route.ts
export const runtime = "edge";

/**
 * Keep /api/products stable (some deploys hit this route).
 * Forward to the canonical /api/products/search handler.
 */
import { POST as SearchPOST } from "./search/route";

export async function POST(req: Request) {
  return SearchPOST(req);
}


