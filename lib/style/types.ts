// FILE: lib/style/types.ts
export type SlotName = "anchor" | "top" | "bottom" | "dress" | "shoe" | "accessory";

export type SlotPlan = {
  slot: SlotName;
  category: string;
  keywords: string[];
  allowed_colors: string[];
  banned_materials: string[];
  min_price: number;
  max_price: number;
};

export type BudgetSplit = { slot: SlotName; min: number; max: number };

export type SearchQuery = { slot: SlotName; query: string };

export type StylePlan = {
  look_id: string;
  aesthetic_read: string;
  vibe_keywords: string[];
  required_slots: SlotName[];
  per_slot: SlotPlan[];
  budget_split: BudgetSplit[];
  retailer_priority: string[];
  search_queries: SearchQuery[];
  budget_total: number;
  currency: string;
  allow_stretch: boolean;
  preferences: {
    gender?: string;
    body_type?: string;
    budget?: string;
    country?: string;
    keywords?: string[];
    sizes?: { top?: string; bottom?: string; dress?: string; shoe?: string };
    prompt?: string;
  };
};

export type Product = {
  id: string;
  retailer: string;
  brand: string;
  title: string;
  price: number;
  currency: string;
  image_url: string;
  product_url: string;
  availability: "in_stock" | "out_of_stock" | "unknown";
  slot: SlotName;
  category: string;
};

export type LookResponse = {
  look_id: string;
  status: "queued" | "running" | "partial" | "complete" | "failed";
  message: string;
  slots: Product[];
  total_price: number | null;
  currency: string;
  missing_slots: SlotName[];
  note?: string;
};
