import { ImageResponse } from "next/og";
import { getDrop } from "@/lib/drops";
import { LookArt } from "@/lib/cardArt";

export const revalidate = 3600;

// 1080x1920 story image for TikTok / Instagram / Pinterest: runwaytwin.com/looks/<slug>/story
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const d = await getDrop(params.slug);
  if (!d) return new Response("Not found", { status: 404 });
  return new ImageResponse(<LookArt d={d} story />, { width: 1080, height: 1920 });
}
