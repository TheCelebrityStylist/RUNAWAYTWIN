import { ImageResponse } from "next/og";
import { getTwin } from "@/lib/twins";

export const revalidate = 86400;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Style Twin result";

export default async function Image({ params }: { params: { code: string } }) {
  const t = await getTwin(params.code);
  const top = t?.matches[0];
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#1A1A1A", color: "#fff", padding: "64px 72px" }}>
      <div style={{ display: "flex", fontSize: 24, letterSpacing: 6, color: "#C9A96E", fontWeight: 700 }}>STYLE TWIN</div>
      {top ? (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 40, color: "#BFBAB5" }}>{t!.mode === "closet" ? "This closet is" : "This outfit is"}</div>
          <div style={{ display: "flex", alignItems: "flex-end", marginTop: 6 }}>
            <div style={{ display: "flex", fontSize: 170, lineHeight: 1 }}>{top.percent}%</div>
            <div style={{ display: "flex", fontSize: 64, marginLeft: 28, marginBottom: 20 }}>{top.celebrity}</div>
          </div>
          {t!.style_name ? <div style={{ display: "flex", fontSize: 32, color: "#BFBAB5", marginTop: 10 }}>{t!.style_name}</div> : null}
        </div>
      ) : (
        <div style={{ display: "flex", fontSize: 80 }}>Who do you dress like?</div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #2E2B28", paddingTop: 24 }}>
        <div style={{ display: "flex", fontSize: 34 }}>RunwayTwin</div>
        <div style={{ display: "flex", fontSize: 26, color: "#C9A96E" }}>Who do you dress like? runwaytwin.com</div>
      </div>
    </div>,
    size,
  );
}
