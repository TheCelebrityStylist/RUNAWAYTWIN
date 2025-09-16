// app/api/chat/tools/index.ts

export type ToolName =
  | "retailer_search"
  | "stock_check"
  | "affiliate_link"
  | "palette_from_image"
  | "fx_convert";

export type ToolContext = {
  /** User preferences passed from the chat UI */
  preferences?: any;
  /** Optional AbortSignal for downstream fetches */
  signal?: AbortSignal;
  /** Optional fetch implementation (defaults to global fetch) */
  fetch?: typeof fetch;
  /** Additional headers for network requests */
  headers?: RequestInit["headers"];
  /** Optional metadata passed through adapters */
  meta?: Record<string, any>;
};

export interface SearchProductsArgs {
  query: string;
  country?: string;
  currency?: string;
  limit?: number;
  budgetMax?: number;
  size?: string;
  category?: string;
  color?: string;
  /** Optional direct URL to inspect */
  url?: string;
}

export interface CheckStockArgs {
  productId: string;
  country: string;
  currency?: string;
}

export interface AffiliateLinkArgs {
  url: string;
  retailer?: string;
}

export interface PaletteFromImageArgs {
  imageUrl: string;
  swatches?: number;
}

export interface FxConvertArgs {
  amount: number;
  from: string;
  to: string;
  precision?: number;
}

export type AdapterProduct = {
  id?: string;
  sku?: string;
  brand?: string | { name?: string } | { [key: string]: any };
  name?: string;
  title?: string;
  description?: string;
  price?: number | string;
  priceText?: string;
  priceAmount?: number | string;
  priceValue?: number | string;
  currency?: string;
  priceCurrency?: string;
  retailer?: string;
  seller?: string | { name?: string };
  store?: string;
  vendor?: string;
  merchant?: string;
  url?: string;
  link?: string;
  href?: string;
  productUrl?: string;
  canonicalUrl?: string;
  image?: string | string[];
  imageUrl?: string;
  image_url?: string;
  imageHref?: string;
  imageAlt?: string;
  thumbnail?: string;
  picture?: string;
  gallery?: string[];
  images?: string[];
  color?: string;
  colors?: string[] | string;
  stock?: string | boolean | null;
  availability?: string;
  availabilityText?: string;
  inStock?: boolean;
  inventoryStatus?: string;
  sizes?: string[] | string;
  country?: string;
  [key: string]: any;
};

export interface AdapterSearchResponse {
  items: AdapterProduct[];
  source: string;
  latency: number;
  meta?: Record<string, any>;
}

export interface SearchProductsResponse {
  items: NormalizedProduct[];
  source: string;
  latency: number;
  meta?: {
    adapters: AdapterInvocationMeta[];
    [key: string]: any;
  };
}

export interface CheckStockResponse {
  productId: string;
  inStock: boolean | string | null;
  price?: number;
  currency?: string;
  retailer?: string;
  url?: string;
  image?: string;
  sizes?: string[];
  source: string;
  latency: number;
  meta?: Record<string, any>;
}

export interface AffiliateLinkResponse {
  url: string;
  retailer?: string | null;
  source: string;
  latency: number;
  meta?: Record<string, any>;
}

export interface PaletteFromImageResponse {
  colors: string[];
  source: string;
  latency: number;
  meta?: Record<string, any>;
}

export interface FxConvertResponse {
  amount: number;
  currency: string;
  rate: number;
  source: string;
  latency: number;
  meta?: Record<string, any>;
}

export interface ToolAdapter {
  id: string;
  searchProducts?: (
    args: SearchProductsArgs,
    ctx: ToolContext
  ) => Promise<AdapterSearchResponse | null | undefined>;
  checkStock?: (
    args: CheckStockArgs,
    ctx: ToolContext
  ) => Promise<CheckStockResponse | null | undefined>;
  affiliateLink?: (
    args: AffiliateLinkArgs,
    ctx: ToolContext
  ) => Promise<AffiliateLinkResponse | null | undefined>;
  paletteFromImage?: (
    args: PaletteFromImageArgs,
    ctx: ToolContext
  ) => Promise<PaletteFromImageResponse | null | undefined>;
  fxConvert?: (
    args: FxConvertArgs,
    ctx: ToolContext
  ) => Promise<FxConvertResponse | null | undefined>;
}

export interface ToolDispatcher {
  adapters: ToolAdapter[];
  runTool<K extends ToolName>(
    name: K,
    args: ToolArguments[K],
    ctx?: Partial<ToolContext>
  ): Promise<ToolResponses[K]>;
}

export type ToolArguments = {
  retailer_search: SearchProductsArgs;
  stock_check: CheckStockArgs;
  affiliate_link: AffiliateLinkArgs;
  palette_from_image: PaletteFromImageArgs;
  fx_convert: FxConvertArgs;
};

export type ToolResponses = {
  retailer_search: SearchProductsResponse;
  stock_check: CheckStockResponse;
  affiliate_link: AffiliateLinkResponse;
  palette_from_image: PaletteFromImageResponse;
  fx_convert: FxConvertResponse;
};

export interface AdapterInvocationMeta {
  source: string;
  latency: number;
  count?: number;
  ok?: boolean;
  error?: string;
}

export interface NormalizedProduct {
  id?: string;
  sku?: string;
  brand?: string;
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  retailer?: string;
  url: string;
  link: string;
  image?: string;
  imageAlt?: string;
  stock?: string | boolean | null;
  sizes?: string[];
  color?: string;
  colors?: string[];
  country?: string;
  source: string;
  raw?: AdapterProduct;
}

const DEFAULT_LIMIT = 12;

export function createToolDispatcher(adapters: ToolAdapter[]): ToolDispatcher {
  const activeAdapters = (adapters || []).filter(Boolean);

  const runTool = async <K extends ToolName>(
    name: K,
    args: ToolArguments[K],
    ctx?: Partial<ToolContext>
  ): Promise<ToolResponses[K]> => {
    const context = withDefaults(ctx);
    switch (name) {
      case "retailer_search":
        return (await runSearch(
          activeAdapters,
          args as SearchProductsArgs,
          context
        )) as ToolResponses[K];
      case "stock_check":
        return (await runStock(
          activeAdapters,
          args as CheckStockArgs,
          context
        )) as ToolResponses[K];
      case "affiliate_link":
        return (await runAffiliate(
          activeAdapters,
          args as AffiliateLinkArgs,
          context
        )) as ToolResponses[K];
      case "palette_from_image":
        return (await runPalette(
          activeAdapters,
          args as PaletteFromImageArgs,
          context
        )) as ToolResponses[K];
      case "fx_convert":
        return (await runFx(
          activeAdapters,
          args as FxConvertArgs,
          context
        )) as ToolResponses[K];
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  };

  return { adapters: activeAdapters, runTool };
}

async function runSearch(
  adapters: ToolAdapter[],
  args: SearchProductsArgs,
  ctx: ToolContext
): Promise<SearchProductsResponse> {
  const limit = normalizeLimit(args?.limit ?? DEFAULT_LIMIT);
  const collected: NormalizedProduct[] = [];
  const meta: AdapterInvocationMeta[] = [];
  const seen = new Set<string>();

  for (const adapter of adapters) {
    if (!adapter?.searchProducts) continue;
    const started = Date.now();
    try {
      const res = await adapter.searchProducts(args, ctx);
      const latency = res?.latency ?? Date.now() - started;
      const source = res?.source || adapter.id;
      const items = Array.isArray(res?.items) ? res!.items : [];
      let accepted = 0;
      for (const raw of items) {
        const normalized = normalizeProduct(raw, {
          source,
          currency: args.currency,
          retailer: raw?.retailer,
        });
        if (!normalized) continue;
        const key = normalized.url;
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push(normalized);
        accepted += 1;
        if (collected.length >= limit) break;
      }
      meta.push({ source, latency, count: accepted, ok: true });
      if (collected.length >= limit) break;
    } catch (err: any) {
      meta.push({
        source: adapter.id,
        latency: Date.now() - started,
        ok: false,
        error: err?.message || "Adapter error",
      });
    }
  }

  const latencyTotal = meta.reduce((sum, m) => sum + (m.latency || 0), 0);

  return {
    items: collected.slice(0, limit),
    source: meta.map((m) => m.source).join(" -> ") || "",
    latency: latencyTotal,
    meta: { adapters: meta },
  };
}

async function runStock(
  adapters: ToolAdapter[],
  args: CheckStockArgs,
  ctx: ToolContext
): Promise<CheckStockResponse> {
  for (const adapter of adapters) {
    if (!adapter?.checkStock) continue;
    const started = Date.now();
    try {
      const res = await adapter.checkStock(args, ctx);
      if (!res) continue;
      return {
        ...res,
        source: res.source || adapter.id,
        latency: res.latency ?? Date.now() - started,
      };
    } catch {
      continue;
    }
  }

  return {
    productId: args.productId,
    inStock: null,
    source: "dispatcher",
    latency: 0,
  };
}

async function runAffiliate(
  adapters: ToolAdapter[],
  args: AffiliateLinkArgs,
  ctx: ToolContext
): Promise<AffiliateLinkResponse> {
  for (const adapter of adapters) {
    if (!adapter?.affiliateLink) continue;
    const started = Date.now();
    try {
      const res = await adapter.affiliateLink(args, ctx);
      if (!res) continue;
      return {
        ...res,
        source: res.source || adapter.id,
        latency: res.latency ?? Date.now() - started,
      };
    } catch {
      continue;
    }
  }

  const fallbackRetailer = retailerFromUrl(args.url) || args.retailer || null;
  return {
    url: args.url,
    retailer: fallbackRetailer,
    source: "dispatcher",
    latency: 0,
  };
}

async function runPalette(
  adapters: ToolAdapter[],
  args: PaletteFromImageArgs,
  ctx: ToolContext
): Promise<PaletteFromImageResponse> {
  for (const adapter of adapters) {
    if (!adapter?.paletteFromImage) continue;
    const started = Date.now();
    try {
      const res = await adapter.paletteFromImage(args, ctx);
      if (!res) continue;
      return {
        ...res,
        source: res.source || adapter.id,
        latency: res.latency ?? Date.now() - started,
      };
    } catch {
      continue;
    }
  }

  const colors = fallbackPalette(args.imageUrl, args.swatches);
  return {
    colors,
    source: "dispatcher",
    latency: 0,
  };
}

async function runFx(
  adapters: ToolAdapter[],
  args: FxConvertArgs,
  ctx: ToolContext
): Promise<FxConvertResponse> {
  for (const adapter of adapters) {
    if (!adapter?.fxConvert) continue;
    const started = Date.now();
    try {
      const res = await adapter.fxConvert(args, ctx);
      if (!res) continue;
      return {
        ...res,
        source: res.source || adapter.id,
        latency: res.latency ?? Date.now() - started,
      };
    } catch {
      continue;
    }
  }

  const { amount, currency, rate } = fallbackFx(args);
  return {
    amount,
    currency,
    rate,
    source: "dispatcher",
    latency: 0,
  };
}

function withDefaults(ctx?: Partial<ToolContext>): ToolContext {
  const fetcher = ctx?.fetch || (typeof fetch !== "undefined" ? fetch : undefined);
  return {
    ...ctx,
    fetch: fetcher,
  };
}

interface NormalizationDefaults {
  source: string;
  currency?: string;
  retailer?: string;
}

function normalizeProduct(
  raw: AdapterProduct,
  defaults: NormalizationDefaults
): NormalizedProduct | null {
  const url = firstTruthy(
    raw?.url,
    raw?.productUrl,
    raw?.canonicalUrl,
    raw?.href,
    raw?.link
  );
  if (!url || typeof url !== "string") return null;

  const brand = normalizeBrand(raw?.brand);
  const title = normalizeTitle(raw, brand);
  const price = normalizePrice(raw?.price ?? raw?.priceAmount ?? raw?.priceValue ?? raw?.priceText);
  const currency = normalizeCurrency(
    raw?.currency || raw?.priceCurrency || defaults.currency
  );

  const retailer = normalizeRetailer(
    raw?.retailer ||
      sellerName(raw?.seller) ||
      raw?.store ||
      raw?.vendor ||
      raw?.merchant ||
      defaults.retailer ||
      retailerFromUrl(url)
  );

  const image = normalizeImage(raw?.image, raw);
  const stock = normalizeStock(raw);
  const sizes = normalizeSizes(raw?.sizes);
  const colors = normalizeColors(raw?.colors, raw?.color);

  return {
    id: raw?.id || raw?.productId || raw?.sku,
    sku: raw?.sku,
    brand: brand || undefined,
    title,
    description: typeof raw?.description === "string" ? raw.description : undefined,
    price: price ?? undefined,
    currency: currency || undefined,
    retailer: retailer || undefined,
    url,
    link: url,
    image: image || undefined,
    imageAlt: typeof raw?.imageAlt === "string" ? raw.imageAlt : undefined,
    stock,
    sizes: sizes || undefined,
    color: typeof raw?.color === "string" ? raw.color : undefined,
    colors: colors || undefined,
    country: raw?.country,
    source: defaults.source,
    raw,
  };
}

function normalizeLimit(limit: number | undefined) {
  if (!Number.isFinite(limit || NaN)) return DEFAULT_LIMIT;
  const n = Math.floor(Number(limit));
  return Math.min(Math.max(n, 1), 50);
}

function normalizeBrand(brand: AdapterProduct["brand"]): string | null {
  if (!brand) return null;
  if (typeof brand === "string") return brand.trim() || null;
  if (typeof brand === "object") {
    const name =
      (brand as any).name ||
      (brand as any)["@value"] ||
      (brand as any)["@id"];
    if (typeof name === "string") return name.trim() || null;
  }
  return null;
}

function normalizeTitle(raw: AdapterProduct, brand: string | null): string {
  const candidates = [raw?.title, raw?.name, raw?.description];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  if (brand) return brand;
  return "Product";
}

function normalizePrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const stripped = value.replace(/[^0-9.,-]/g, "");
  if (!stripped) return null;
  let normalized = stripped;
  const commaCount = (normalized.match(/,/g) || []).length;
  const dotCount = (normalized.match(/\./g) || []).length;
  if (commaCount && dotCount) {
    if (normalized.indexOf(",") > normalized.indexOf(".")) {
      normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (commaCount && !dotCount) {
    normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
  } else {
    normalized = normalized.replace(/,/g, "");
  }
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function normalizeCurrency(value: unknown): string | null {
  if (!value) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length === 1) {
    if (trimmed === "€") return "EUR";
    if (trimmed === "$") return "USD";
    if (trimmed === "£") return "GBP";
  }
  if (/^[a-z]{3}$/i.test(trimmed)) return trimmed.toUpperCase();
  return trimmed;
}

function normalizeRetailer(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^www\./i, "");
}

function normalizeImage(image: AdapterProduct["image"], raw: AdapterProduct) {
  if (!image) {
    const candidates = [
      raw?.imageUrl,
      raw?.image_url,
      raw?.imageHref,
      raw?.thumbnail,
      raw?.picture,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
    if (Array.isArray(raw?.images) && raw.images.length) {
      const first = raw.images.find((it) => typeof it === "string" && it.trim());
      if (first) return first.trim();
    }
    if (Array.isArray(raw?.gallery) && raw.gallery.length) {
      const first = raw.gallery.find((it) => typeof it === "string" && it.trim());
      if (first) return first.trim();
    }
    return undefined;
  }
  if (typeof image === "string") return image.trim();
  if (Array.isArray(image)) {
    const first = image.find((it) => typeof it === "string" && it.trim());
    if (first) return first.trim();
  }
  return undefined;
}

function normalizeStock(raw: AdapterProduct): string | boolean | null | undefined {
  if (typeof raw?.inStock === "boolean") return raw.inStock;
  const availability =
    raw?.stock ??
    raw?.availability ??
    raw?.availabilityText ??
    raw?.inventoryStatus;
  if (typeof availability === "boolean") return availability;
  if (availability == null) return undefined;
  if (typeof availability === "string") {
    const lower = availability.toLowerCase();
    if (/(pre[-\s]?order)/.test(lower)) return "preorder";
    if (/(instock|in\s?stock|available)/.test(lower)) return true;
    if (/(outofstock|out\s?of\s?stock|sold\s?out)/.test(lower)) return false;
    return availability;
  }
  return undefined;
}

function normalizeSizes(value: AdapterProduct["sizes"]): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === "string" ? v.trim() : String(v))).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,/|]/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return undefined;
}

function normalizeColors(colors: AdapterProduct["colors"], color?: string) {
  const arr: string[] = [];
  if (Array.isArray(colors)) {
    colors.forEach((c) => {
      if (typeof c === "string" && c.trim()) arr.push(c.trim());
    });
  } else if (typeof colors === "string") {
    colors
      .split(/[,/|]/)
      .map((c) => c.trim())
      .filter(Boolean)
      .forEach((c) => arr.push(c));
  }
  if (typeof color === "string" && color.trim()) arr.push(color.trim());
  return arr.length ? Array.from(new Set(arr)) : undefined;
}

function firstTruthy<T>(...values: T[]): T | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
    if (value) return value;
  }
  return null;
}

function sellerName(seller: AdapterProduct["seller"]): string | null {
  if (!seller) return null;
  if (typeof seller === "string") return seller;
  if (typeof seller === "object") {
    const name = (seller as any).name || (seller as any)["@value"];
    if (typeof name === "string") return name;
  }
  return null;
}

function retailerFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

function fallbackPalette(imageUrl: string, swatches = 5): string[] {
  const base = ["#2E2E2E", "#7F7F7F", "#EAE7E2", "#C7A27A", "#4A646C", "#B0C2C1", "#252A34"];
  const count = Math.max(1, Math.min(swatches || base.length, base.length));
  if (!imageUrl) return base.slice(0, count);
  let hash = 0;
  for (let i = 0; i < imageUrl.length; i += 1) {
    hash = (hash * 31 + imageUrl.charCodeAt(i)) % base.length;
  }
  const rotated = [...base.slice(hash), ...base.slice(0, hash)];
  return rotated.slice(0, count);
}

function fallbackFx(args: FxConvertArgs) {
  const from = args?.from ? args.from.toUpperCase() : "EUR";
  const to = args?.to ? args.to.toUpperCase() : "EUR";
  const amount = Number(args?.amount ?? 0) || 0;
  const precision = Number.isFinite(args?.precision || NaN)
    ? Math.max(0, Math.min(4, Math.floor(Number(args.precision))))
    : 2;

  const matrix: Record<string, Record<string, number>> = {
    EUR: { USD: 1.08, GBP: 0.86, EUR: 1 },
    USD: { EUR: 0.93, GBP: 0.80, USD: 1 },
    GBP: { EUR: 1.16, USD: 1.24, GBP: 1 },
  };

  const rate = matrix[from]?.[to] ?? 1;
  const converted = Number((amount * rate).toFixed(precision));

  return { amount: converted, currency: to, rate };
}
