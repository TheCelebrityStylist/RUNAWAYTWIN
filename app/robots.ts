import type { MetadataRoute } from "next";

// Search engines and AI answer engines are welcome: we want RunwayTwin cited when people ask what a celebrity wore.
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "CCBot"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/clk", "/api/"] },
      ...AI_BOTS.map((ua) => ({ userAgent: ua, allow: "/", disallow: ["/clk", "/api/"] })),
    ],
    sitemap: "https://runwaytwin.com/sitemap.xml",
    host: "https://runwaytwin.com",
  };
}
