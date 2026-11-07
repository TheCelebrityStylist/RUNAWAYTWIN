/* The RunwayTwin Journal: long-form, citable articles. Content is data; app/blog/[slug] renders it. */

export type Block =
  | { t: "p"; text: string }
  | { t: "h2"; text: string }
  | { t: "h3"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "table"; head: string[]; rows: string[][]; caption?: string }
  | { t: "stats"; items: { value: string; label: string }[] }
  | { t: "callout"; title?: string; text: string }
  | { t: "quote"; text: string; by?: string };

export type Article = {
  slug: string;
  title: string; // H1
  seoTitle: string; // <title>, keyword first
  description: string;
  kicker: string;
  dek: string; // standfirst under the H1
  published: string; // YYYY-MM-DD
  updated?: string;
  readMins: number;
  tags: string[];
  body: Block[];
  faq?: { q: string; a: string }[];
  sources?: { name: string; url: string }[];
  related?: string[];
  cta?: { text: string; href: string };
  dataset?: boolean; // marks articles built on RunwayTwin's own data
};
