import { describe, it, expect } from "vitest";
import { extractProductsFromJsonLd } from "@/lib/extract/jsonld";

describe("extractProductsFromJsonLd", () => {
  it("extracts product information from JSON-LD blocks", () => {
    const html = `
      <html><head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Totême Contour Rib Top",
        "brand": { "name": "Totême" },
        "image": "https://images.example.com/toteme.jpg",
        "sku": "123",
        "offers": {
          "@type": "Offer",
          "price": "190",
          "priceCurrency": "EUR",
          "availability": "http://schema.org/InStock",
          "seller": { "name": "NET-A-PORTER" },
          "url": "https://www.net-a-porter.com/product"
        }
      }
      </script>
      </head></html>`;

    const products = extractProductsFromJsonLd(html);
    expect(products).toHaveLength(1);
    const product = products[0];
    expect(product.name).toContain("Totême");
    expect(product.brand).toBe("Totême");
    expect(product.price).toBe(190);
    expect(product.currency).toBe("EUR");
    expect(product.image).toContain("toteme.jpg");
    expect(product.url).toContain("net-a-porter");
    expect(product.availability).toContain("InStock");
  });
});
