/* Shareable Style Twin results, written by the app (text only, no photos or names). */
const APP = process.env.NEXT_PUBLIC_APP_URL || "https://app.runwaytwin.com";
const APP_ID = "69b1ecd54f5ff3779a3069a6";

export type TwinMatch = { celebrity: string; percent: number; why?: string; missing_name?: string; missing_query?: string };
export type Twin = { code: string; mode: "photo" | "closet"; style_name?: string; style_line?: string; matches: TwinMatch[] };

export async function getTwin(code: string): Promise<Twin | null> {
  if (!/^[a-z0-9]{6,12}$/.test(code)) return null;
  try {
    const q = encodeURIComponent(JSON.stringify({ code }));
    const r = await fetch(`${APP}/api/apps/${APP_ID}/entities/TwinResult?q=${q}&limit=1`, { next: { revalidate: 86400 } });
    if (!r.ok) return null;
    const rows = await r.json();
    const t = Array.isArray(rows) ? rows.find((x: Twin) => x.code === code) : null;
    return t?.matches?.length ? t : null;
  } catch {
    return null;
  }
}
