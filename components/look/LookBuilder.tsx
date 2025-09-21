"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseOutfit, type OutfitItem } from "@/lib/look/parseOutfit";

type PinnedLook = {
  id: string;
  savedAt: string;
  items: OutfitItem[];
  fingerprint: string;
};

const CLOSET_KEY = "rt_closet_v1";
const CLOSET_LIMIT = 6;

function fingerprintItems(items: OutfitItem[]): string {
  return items
    .map((item) => [item.category || "", item.brandItem || "", item.link || "", item.price || ""].join("|"))
    .join("::");
}

function sanitizeStoredLook(raw: any): PinnedLook | null {
  if (!raw || typeof raw !== "object" || typeof raw.id !== "string") return null;
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const items: OutfitItem[] = itemsRaw
    .map((entry: any) => {
      if (!entry || typeof entry !== "object") return null;
      const category = typeof entry.category === "string" ? entry.category : "";
      const brandItem = typeof entry.brandItem === "string" ? entry.brandItem : "";
      if (!category || !brandItem) return null;
      const item: OutfitItem = { category, brandItem };
      if (typeof entry.price === "string" && entry.price) item.price = entry.price;
      if (typeof entry.retailer === "string" && entry.retailer) item.retailer = entry.retailer;
      if (typeof entry.link === "string" && entry.link) item.link = entry.link;
      if (typeof entry.image === "string" && entry.image) item.image = entry.image;
      return item;
    })
    .filter(Boolean) as OutfitItem[];
  if (!items.length) return null;
  const savedAt = typeof raw.savedAt === "string" ? raw.savedAt : new Date().toISOString();
  const fingerprint =
    typeof raw.fingerprint === "string" && raw.fingerprint ? raw.fingerprint : fingerprintItems(items);
  return {
    id: raw.id,
    savedAt,
    items,
    fingerprint,
  };
}

function ProductCard({ item }: { item: OutfitItem }) {
  const { category, brandItem, price, retailer, link, image } = item;
  const content = (
    <>
      <div
        className="aspect-[4/5] w-full overflow-hidden rounded-2xl border bg-[var(--rt-ivory)]"
        style={{ borderColor: "var(--rt-border)" }}
      >
        {image ? (
          <img
            src={image}
            alt={brandItem}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[12px]" style={{ color: "var(--rt-muted)" }}>
            Image coming soon
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-[12px] uppercase tracking-wide" style={{ color: "var(--rt-muted)" }}>
          {category}
        </div>
        <div className="text-[14px] font-medium leading-snug">{brandItem}</div>
        <div className="text-[13px]" style={{ color: "var(--rt-charcoal)" }}>
          {price ? price : ""}
          {price && retailer ? " — " : ""}
          {retailer || ""}
        </div>
      </div>
    </>
  );

  if (link) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className="group block">
        {content}
      </a>
    );
  }

  return <div className="group block">{content}</div>;
}

function ClosetCard({ look, onRemove }: { look: PinnedLook; onRemove: (id: string) => void }) {
  const previewItems = look.items.slice(0, 3);
  const savedDate = useMemo(() => {
    const parsed = new Date(look.savedAt);
    if (Number.isNaN(parsed.getTime())) return "";
    try {
      return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return parsed.toISOString().split("T")[0];
    }
  }, [look.savedAt]);

  return (
    <article
      className="rounded-2xl border bg-white/95 p-4 shadow-sm"
      style={{ borderColor: "var(--rt-border)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--rt-muted)" }}>
            Pinned look
          </p>
          {savedDate ? (
            <p className="text-[12px]" style={{ color: "var(--rt-charcoal)" }}>
              {savedDate}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onRemove(look.id)}
          className="text-[12px] text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
        >
          Remove
        </button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {previewItems.map((item, index) => (
          item.link ? (
            <a
              key={`${look.id}-thumb-${index}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-xl border bg-[var(--rt-ivory)]"
              style={{ borderColor: "var(--rt-border)" }}
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.brandItem}
                  className="h-20 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-20 items-center justify-center text-[11px]" style={{ color: "var(--rt-muted)" }}>
                  View item
                </div>
              )}
            </a>
          ) : (
            <div
              key={`${look.id}-thumb-${index}`}
              className="flex h-20 items-center justify-center overflow-hidden rounded-xl border bg-[var(--rt-ivory)] text-[11px]"
              style={{ borderColor: "var(--rt-border)", color: "var(--rt-muted)" }}
            >
              {item.brandItem}
            </div>
          )
        ))}
      </div>
      <ul className="mt-3 space-y-1 text-[12px]" style={{ color: "var(--rt-charcoal)" }}>
        {previewItems.map((item, index) => (
          <li key={`${look.id}-meta-${index}`}>
            {item.category}: {item.brandItem}
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function LookBuilder({ text }: { text: string }) {
  const items = useMemo(() => parseOutfit(text), [text]);
  const [pinnedLooks, setPinnedLooks] = useState<PinnedLook[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(CLOSET_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return;
      const cleaned: PinnedLook[] = [];
      for (const entry of parsed) {
        const look = sanitizeStoredLook(entry);
        if (look) cleaned.push(look);
        if (cleaned.length >= CLOSET_LIMIT) break;
      }
      if (cleaned.length) {
        setPinnedLooks(cleaned);
      }
    } catch (error) {
      console.warn("closet load failed", error);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const syncCloset = useCallback((updater: (prev: PinnedLook[]) => PinnedLook[]) => {
    setPinnedLooks((prev) => {
      const next = updater(prev);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(CLOSET_KEY, JSON.stringify(next));
        } catch (error) {
          console.warn("closet write failed", error);
        }
      }
      return next;
    });
  }, []);

  const fingerprintCurrent = useMemo(() => (items.length ? fingerprintItems(items) : ""), [items]);

  const isPinned = useMemo(
    () => !!(fingerprintCurrent && pinnedLooks.some((look) => look.fingerprint === fingerprintCurrent)),
    [fingerprintCurrent, pinnedLooks]
  );

  const handlePin = useCallback(() => {
    if (!items.length || !fingerprintCurrent) {
      showToast("Generate a look first");
      return;
    }
    let saved = false;
    syncCloset((prev) => {
      if (prev.some((look) => look.fingerprint === fingerprintCurrent)) {
        return prev;
      }
      const look: PinnedLook = {
        id: crypto.randomUUID(),
        savedAt: new Date().toISOString(),
        items: items.map((item) => ({ ...item })),
        fingerprint: fingerprintCurrent,
      };
      saved = true;
      return [look, ...prev].slice(0, CLOSET_LIMIT);
    });
    showToast(saved ? "Saved to your Closet" : "Already in your Closet");
  }, [items, fingerprintCurrent, showToast, syncCloset]);

  const handleRemove = useCallback(
    (id: string) => {
      let removed = false;
      syncCloset((prev) => {
        const next = prev.filter((look) => {
          if (look.id === id) {
            removed = true;
            return false;
          }
          return true;
        });
        return next;
      });
      if (removed) {
        showToast("Removed from Closet");
      }
    },
    [showToast, syncCloset]
  );

  const hasItems = items.length > 0;

  return (
    <div className="card space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold tracking-tight">Your Look</h3>
        <button
          type="button"
          onClick={handlePin}
          disabled={!hasItems}
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] transition"
          style={{
            borderColor: "var(--rt-border)",
            background: "white",
            opacity: hasItems ? 1 : 0.5,
            color: "var(--rt-charcoal)",
          }}
        >
          <span aria-hidden>📌</span>
          {isPinned ? "In Closet" : "Pin to Closet"}
        </button>
      </div>
      {toast ? (
        <div
          className="rounded-full border px-3 py-1 text-[12px]"
          style={{ borderColor: "var(--rt-border)", background: "white", color: "var(--rt-charcoal)" }}
        >
          {toast}
        </div>
      ) : null}
      {hasItems ? (
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <ProductCard key={`${item.category}-${index}`} item={item} />
          ))}
        </div>
      ) : (
        <p className="text-[13px]" style={{ color: "var(--rt-charcoal)" }}>
          I’ll populate this gallery as soon as I recommend specific items with links.
        </p>
      )}
      {pinnedLooks.length > 0 ? (
        <div className="space-y-3 border-t pt-4" style={{ borderColor: "var(--rt-border)" }}>
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[13px] font-semibold tracking-tight">Your Closet</h4>
            <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--rt-muted)" }}>
              {pinnedLooks.length} saved
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {pinnedLooks.map((look) => (
              <ClosetCard key={look.id} look={look} onRemove={handleRemove} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
