"use client";

import React, { useMemo } from "react";

type OutfitItem = {
  label: string;
  description: string;
  brand?: string;
  itemName?: string;
  price?: string;
  retailer?: string;
  link?: string;
  image?: string;
};

type ListItem = {
  raw: string;
  label?: string;
  value?: string;
};

type Section = {
  title: string;
  type: "outfit" | "list" | "text";
  outfitItems?: OutfitItem[];
  list?: ListItem[];
  paragraphs?: string[];
};

type Parsed = {
  intro: string[];
  sections: Section[];
  cta?: string;
};

function stripMarkdown(text: string) {
  return text.replace(/\*\*/g, "").trim();
}

function parseLabelValue(text: string): ListItem {
  const cleaned = text.trim();
  const boldMatch = cleaned.match(/^\*\*([^*]+)\*\*\s*:?\s*(.*)$/);
  if (boldMatch) {
    const [, label, value] = boldMatch;
    return { raw: cleaned, label: label.trim(), value: value.trim() };
  }

  const colonIdx = cleaned.indexOf(":");
  if (colonIdx !== -1) {
    const label = cleaned.slice(0, colonIdx).trim();
    const value = cleaned.slice(colonIdx + 1).trim();
    if (label) return { raw: cleaned, label: stripMarkdown(label), value };
  }

  return { raw: cleaned };
}

function parseOutfitItem(text: string): OutfitItem | null {
  let working = text.trim();

  let label = "";
  const labelMatch = working.match(/^\*\*([^*]+)\*\*\s*:?\s*(.*)$/);
  if (labelMatch) {
    label = labelMatch[1].trim();
    working = labelMatch[2].trim();
  } else {
    const colonIdx = working.indexOf(":");
    if (colonIdx !== -1) {
      label = stripMarkdown(working.slice(0, colonIdx));
      working = working.slice(colonIdx + 1).trim();
    }
  }

  const segments = working
    .split("|")
    .map((seg) => seg.trim())
    .filter(Boolean);

  const description = segments.shift() || working;
  let price: string | undefined;
  let retailer: string | undefined;
  let link: string | undefined;
  let image: string | undefined;

  segments.forEach((seg) => {
    if (!seg) return;
    const imgMatch = seg.match(/!\[[^\]]*\]\((https?:[^)]+)\)/i);
    if (imgMatch) {
      image = imgMatch[1];
      return;
    }
    const linkMatch = seg.match(/\[([^\]]+)\]\((https?:[^)]+)\)/i);
    if (linkMatch) {
      link = linkMatch[2];
      return;
    }
    if (/^https?:\/\//i.test(seg)) {
      link = seg;
      return;
    }
    if (!price && /[€$£]|USD|EUR|GBP|\d/.test(seg)) {
      price = seg;
      return;
    }
    if (!retailer) {
      retailer = stripMarkdown(seg);
    }
  });

  const dashIdx = description.indexOf("—");
  const brand = dashIdx !== -1 ? description.slice(0, dashIdx).trim() : undefined;
  const itemName = dashIdx !== -1 ? description.slice(dashIdx + 1).trim() : undefined;

  return {
    label: label || "Item",
    description: stripMarkdown(description),
    brand,
    itemName,
    price: price ? stripMarkdown(price) : undefined,
    retailer: retailer ? stripMarkdown(retailer) : undefined,
    link,
    image,
  };
}

function parseMessage(text: string): Parsed {
  const intro: string[] = [];
  const sections: Section[] = [];
  let cta: string | undefined;
  let current: Section | null = null;

  const ensureCurrent = () => {
    if (!current) {
      current = { title: "", type: "text", paragraphs: [] };
      sections.push(current);
    }
    return current;
  };

  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;

    if (/upgrade for €19\/?month/i.test(line)) {
      cta = stripMarkdown(line.replace(/^✨\s*/, ""));
      return;
    }

    if (/^[-•]/.test(line)) {
      const bullet = line.replace(/^[-•]\s*/, "").trim();
      const section = current ?? ensureCurrent();
      if (section.title.toLowerCase() === "outfit") {
        const item = parseOutfitItem(bullet);
        if (item) {
          section.type = "outfit";
          section.outfitItems = [...(section.outfitItems || []), item];
          return;
        }
      }
      section.type = section.type === "outfit" ? "outfit" : "list";
      section.list = [...(section.list || []), parseLabelValue(bullet)];
      return;
    }

    const headingMatch = line.match(/^\*{0,2}(.+?)\*{0,2}\s*:\s*(.*)$/);
    if (!/^[-•]/.test(line) && headingMatch) {
      const title = stripMarkdown(headingMatch[1]);
      const rest = headingMatch[2].trim();
      const section: Section = { title, type: title.toLowerCase() === "outfit" ? "outfit" : "list" };
      if (rest) {
        if (section.type === "outfit") {
          const item = parseOutfitItem(rest);
          if (item) {
            section.outfitItems = [item];
          } else {
            section.list = [parseLabelValue(rest)];
          }
        } else {
          section.list = [parseLabelValue(rest)];
        }
      }
      sections.push(section);
      current = section;
      return;
    }

    if (!sections.length) {
      intro.push(stripMarkdown(line));
      return;
    }

    const section = ensureCurrent();
    section.paragraphs = [...(section.paragraphs || []), stripMarkdown(line)];
  });

  return { intro, sections, cta };
}

let keyCounter = 0;
function uniqueKey(prefix: string) {
  keyCounter += 1;
  return `${prefix}-${keyCounter}`;
}

function applyBold(str: string) {
  const segments = str.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return segments.map((seg, idx) => {
    if (seg.startsWith("**") && seg.endsWith("**")) {
      return (
        <span key={uniqueKey("b")} className="font-semibold">
          {seg.slice(2, -2)}
        </span>
      );
    }
    return seg;
  });
}

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  while (remaining.length) {
    const match = remaining.match(/\[([^\]]+)\]\((https?:[^)]+)\)/);
    if (!match || match.index === undefined) {
      nodes.push(...applyBold(remaining));
      break;
    }
    const [full, label, url] = match;
    const before = remaining.slice(0, match.index);
    if (before) nodes.push(...applyBold(before));
    nodes.push(
      <a
        key={uniqueKey("link")}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline-offset-2 hover:underline"
      >
        {applyBold(label)}
      </a>
    );
    remaining = remaining.slice(match.index + full.length);
  }
  return nodes;
}

function renderList(section: Section) {
  if (!section.list?.length && !section.paragraphs?.length) return null;
  const list = section.list || [];
  const hasLabels = list.some((item) => item.label);
  const hasPlain = list.some((item) => !item.label);

  return (
    <div className="space-y-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--rt-muted)]">
        {section.title}
      </div>

      {section.paragraphs?.map((p, idx) => (
        <p key={uniqueKey("para")} className="text-[14px] leading-relaxed">
          {renderInline(p)}
        </p>
      ))}

      {!!list.length && (
        hasLabels && !hasPlain ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((item) => (
              <div
                key={uniqueKey("card")}
                className="rounded-2xl border px-4 py-3 bg-[rgba(250,247,242,0.7)]"
                style={{ borderColor: "var(--rt-border)" }}
              >
                <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--rt-muted)]">
                  {item.label}
                </div>
                <div className="mt-1 text-[14px] font-medium leading-snug">
                  {item.value ? renderInline(item.value) : "N/A"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-2 text-[14px]">
            {list.map((item) => (
              <li key={uniqueKey("li")} className="flex gap-2">
                <span className="text-[var(--rt-muted)]">•</span>
                <span>{renderInline(item.value ?? item.raw)}</span>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

function renderOutfit(section: Section) {
  const items = section.outfitItems || [];
  if (!items.length) return null;

  return (
    <div className="space-y-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--rt-muted)]">
        {section.title}
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={uniqueKey("look")}
            className="flex gap-3 rounded-2xl border px-4 py-4 bg-white/70"
            style={{ borderColor: "var(--rt-border)" }}
          >
            <div
              className="w-[88px] h-[112px] rounded-xl overflow-hidden border bg-[var(--rt-ivory)]"
              style={{ borderColor: "var(--rt-border)" }}
            >
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt={item.description}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[var(--rt-ivory)] to-white" />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--rt-muted)]">
                {item.label}
              </div>
              {item.brand && item.itemName ? (
                <>
                  <div className="uppercase tracking-[0.18em] text-[11px] text-[var(--rt-muted)]">
                    {item.brand}
                  </div>
                  <div className="text-[15px] font-semibold leading-snug text-black">
                    {item.itemName}
                  </div>
                </>
              ) : (
                <div className="text-[15px] font-semibold leading-snug text-black">
                  {item.description}
                </div>
              )}
              {(item.price || item.retailer) && (
                <div className="text-[13px] text-[var(--rt-charcoal)]">
                  {item.price}
                  {item.price && item.retailer ? " • " : ""}
                  {item.retailer}
                </div>
              )}
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-black underline-offset-4 hover:underline"
                >
                  Shop {item.retailer || "this piece"} →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AssistantMessage({ text }: { text: string }) {
  const parsed = useMemo(() => parseMessage(text), [text]);
  keyCounter = 0;

  return (
    <div className="space-y-6 text-[14px] leading-relaxed" style={{ color: "var(--rt-charcoal)" }}>
      {parsed.intro.length > 0 && (
        <div className="space-y-2">
          {parsed.intro.map((line) => (
            <p key={uniqueKey("intro")} className="text-[14px] leading-relaxed">
              {renderInline(line)}
            </p>
          ))}
        </div>
      )}

      {parsed.sections.map((section, idx) => (
        <div key={uniqueKey("section")} className={idx > 0 ? "pt-1" : undefined}>
          {section.type === "outfit" ? renderOutfit(section) : renderList(section)}
        </div>
      ))}

      {parsed.cta && (
        <div className="rounded-2xl bg-black text-white px-4 py-4 text-[13px] leading-relaxed">
          {renderInline(parsed.cta)}
        </div>
      )}
    </div>
  );
}
