"use client";

export default function Page() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(180deg,#fff,#f7f5f2)" }}>
      <div style={{ textAlign: "center", maxWidth: 720, padding: 24 }}>
        <h1 style={{ fontSize: 42, lineHeight: 1.1, margin: 0 }}>RunwayTwin</h1>
        <p style={{ color: "#555", marginTop: 10 }}>
          Be Their <b>Runway Twin</b> ✨ — AI celebrity stylist (Next.js on Vercel).
        </p>
        <a
          href="#"
          style={{
            display: "inline-block",
            marginTop: 16,
            padding: "12px 18px",
            borderRadius: 999,
            background: "#0a0a0a",
            color: "white",
            textDecoration: "none"
          }}
        >
          It Works 🎉
        </a>
      </div>
    </main>
  );
}
