/* Shared artwork for link previews (1200x630) and story images (1080x1920). Text-only by design: no celebrity photos. */
import type { Drop } from "@/lib/drops";
import { euro } from "@/lib/drops";

const GOLD = "#C9A96E";

export function LookArt({ d, story = false }: { d: Drop; story?: boolean }) {
  const W = story ? 1080 : 1200;
  const big = story ? 210 : 150;
  const t = d.twin;
  const credited = d.items.filter((i) => i.brand && i.brand_confidence === "high").map((i) => i.brand as string);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#1A1A1A", color: "#fff", padding: story ? "120px 90px" : "60px 72px", fontFamily: "serif" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: story ? 30 : 22, letterSpacing: 6, color: GOLD, fontFamily: "sans-serif", fontWeight: 700 }}>
          {story ? "WORN THIS WEEK" : "DROP RADAR"} · {d.event.split(",")[0].toUpperCase().slice(0, 40)}
        </div>
        <div style={{ display: "flex", fontSize: story ? 104 : 72, lineHeight: 1.02, marginTop: story ? 40 : 22, maxWidth: W - 160 }}>{d.celebrity}</div>
        {credited.length > 0 && (
          <div style={{ display: "flex", fontSize: story ? 38 : 28, color: "#BFBAB5", marginTop: 16, fontFamily: "sans-serif" }}>
            in {credited.slice(0, 2).join(" & ")}
          </div>
        )}
        {d.palette?.length ? (
          <div style={{ display: "flex", marginTop: story ? 50 : 26 }}>
            {d.palette.slice(0, 5).map((h) => (
              <div key={h} style={{ width: story ? 64 : 40, height: story ? 64 : 40, borderRadius: 999, background: h, marginRight: 14, border: "2px solid #3A3632" }} />
            ))}
          </div>
        ) : null}
      </div>

      {t ? (
        <div style={{ display: "flex", flexDirection: story ? "column" : "row", alignItems: story ? "flex-start" : "flex-end" }}>
          <div style={{ display: "flex", fontSize: big, lineHeight: 1, color: "#fff" }}>{t.score}%</div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: story ? 0 : 36, marginTop: story ? 20 : 0, marginBottom: story ? 0 : 14 }}>
            <div style={{ display: "flex", fontSize: story ? 70 : 48 }}>of the look for {euro(t.cost)}</div>
            <div style={{ display: "flex", fontSize: story ? 36 : 26, color: "#BFBAB5", fontFamily: "sans-serif", marginTop: 10 }}>The originals: {euro(t.originals)}</div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", fontSize: story ? 70 : 48 }}>Every piece, at three prices</div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px solid #2E2B28", paddingTop: story ? 40 : 24 }}>
        <div style={{ display: "flex", fontSize: story ? 46 : 34 }}>RunwayTwin</div>
        <div style={{ display: "flex", fontSize: story ? 30 : 24, color: GOLD, fontFamily: "sans-serif" }}>runwaytwin.com/looks</div>
      </div>
    </div>
  );
}
