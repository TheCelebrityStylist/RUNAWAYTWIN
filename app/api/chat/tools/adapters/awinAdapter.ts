// app/api/chat/tools/adapters/awinAdapter.ts
import type {
  AffiliateLinkArgs,
  AffiliateLinkResponse,
  SearchProductsArgs,
  ToolAdapter,
  ToolContext,
} from "../index";

const AWIN_SOURCE = "awin";

function hasToken() {
  return Boolean(process.env.AWIN_API_TOKEN);
}

export const awinAdapter: ToolAdapter = {
  id: AWIN_SOURCE,
  async searchProducts(_args: SearchProductsArgs, _ctx: ToolContext) {
    if (!hasToken()) return null;
    const started = Date.now();
    return {
      items: [],
      source: AWIN_SOURCE,
      latency: Date.now() - started,
      meta: { status: "pending-integration" },
    };
  },
  async affiliateLink(args: AffiliateLinkArgs) {
    if (!hasToken()) return null;
    const started = Date.now();
    return {
      url: args.url,
      retailer: args.retailer || retailerFromUrl(args.url) || null,
      source: AWIN_SOURCE,
      latency: Date.now() - started,
      meta: { passthrough: true },
    } satisfies AffiliateLinkResponse;
  },
};

function retailerFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}
