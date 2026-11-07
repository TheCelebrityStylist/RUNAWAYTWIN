import { ImageResponse } from "next/og";
import { getArticle } from "@/lib/journal";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "RunwayTwin Journal";

export default function Image({ params }: { params: { slug: string } }) {
  const a = getArticle(params.slug);
  const stat = a?.body.find((b) => b.t === "stats");
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#1A1A1A", color: "#fff", padding: "60px 72px" }}>
      <div style={{ display: "flex", fontSize: 22, letterSpacing: 6, color: "#C9A96E", fontWeight: 700 }}>{(a?.kicker || "RUNWAYTWIN JOURNAL").toUpperCase()}</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: (a?.title.length || 0) > 70 ? 54 : 64, lineHeight: 1.08 }}>{a?.title || "RunwayTwin Journal"}</div>
        {stat && stat.t === "stats" ? (
          <div style={{ display: "flex", marginTop: 28 }}>
            {stat.items.slice(0, 3).map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", marginRight: 48 }}>
                <div style={{ display: "flex", fontSize: 44, color: "#C9A96E" }}>{s.value}</div>
                <div style={{ display: "flex", fontSize: 18, color: "#BFBAB5", maxWidth: 260 }}>{s.label}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #2E2B28", paddingTop: 22 }}>
        <div style={{ display: "flex", fontSize: 32 }}>RunwayTwin</div>
        <div style={{ display: "flex", fontSize: 22, color: "#C9A96E" }}>runwaytwin.com/blog</div>
      </div>
    </div>,
    size,
  );
}
