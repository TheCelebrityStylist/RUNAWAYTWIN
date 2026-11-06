import { ImageResponse } from "next/og";
import { getDrop } from "@/lib/drops";
import { LookArt } from "@/lib/cardArt";

export const revalidate = 3600;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "RunwayTwin look breakdown";

export default async function Image({ params }: { params: { slug: string } }) {
  const d = await getDrop(params.slug);
  if (!d) return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", background: "#1A1A1A", color: "#fff", fontSize: 72, alignItems: "center", justifyContent: "center" }}>RunwayTwin</div>, size);
  return new ImageResponse(<LookArt d={d} />, size);
}
