import Link from "next/link";

type Product = {
  id?: string;
  title?: string;
  url?: string | null;
  brand?: string | null;
  category?: string | null;
  price?: number | null;
  currency?: string | null;
  image?: string | null;
};

async function fetchProducts(): Promise<Product[]> {
  try {
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const res = await fetch(`${base}/api/products/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      // Important — prevents Next cache weirdness
      cache: "no-store",

      body: JSON.stringify({
        query: "minimal capsule wardrobe",
        providers: ["web"], // ← critical: avoids affiliate crashes
        limit: 24,
      }),
    });

    if (!res.ok) {
      console.error("Product fetch failed:", res.status);
      return [];
    }

    const data = await res.json().catch(() => null);

    return Array.isArray(data?.items) ? data.items : [];
  } catch (err) {
    console.error("Products fetch crash:", err);
    return [];
  }
}

export default async function ProductsPage() {
  const products = await fetchProducts();

  return (
    <main
      style={{
        maxWidth: 1300,
        margin: "60px auto",
        padding: "0 24px",
        fontFamily: "system-ui",
      }}
    >
      <header style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 34, fontWeight: 700 }}>
          Discover Products
        </h1>

        <p style={{ opacity: 0.6 }}>
          Live products sourced in real-time.
        </p>
      </header>

      {products.length === 0 && (
        <div
          style={{
            padding: 40,
            border: "1px solid #eee",
            borderRadius: 12,
          }}
        >
          No products returned.

          <br />
          <br />

          👉 Test your API directly:
          <br />
          <code>/api/products/search</code>
        </div>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
          gap: 28,
        }}
      >
        {products.map((p, i) => (
          <article
            key={p.id ?? i}
            style={{
              border: "1px solid #eee",
              borderRadius: 14,
              overflow: "hidden",
              transition: "0.2s",
              background: "#fff",
            }}
          >
            {p.image ? (
              <img
                src={p.image}
                alt={p.title ?? "product"}
                style={{
                  width: "100%",
                  height: 320,
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  height: 320,
                  background: "#f4f4f4",
                }}
              />
            )}

            <div style={{ padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {p.title ?? "Untitled"}
              </div>

              {p.brand && (
                <div style={{ fontSize: 14, opacity: 0.6 }}>
                  {p.brand}
                </div>
              )}

              {p.price && (
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 500,
                  }}
                >
                  {p.currency ?? "EUR"} {p.price}
                </div>
              )}

              {p.url && (
                <Link
                  href={p.url}
                  target="_blank"
                  style={{
                    display: "inline-block",
                    marginTop: 12,
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  View product →
                </Link>
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

