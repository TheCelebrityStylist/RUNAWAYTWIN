/** @type {import('next').NextConfig} */

// The RunwayTwin app (the tool, accounts, payments) runs on Base44.
// Base44 serves the app on app.runwaytwin.com (CNAME -> base44.onrender.com).
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || "https://app.runwaytwin.com";

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // Temporary (307) while the app origin may still change; make permanent once app.runwaytwin.com is live.
    const to = (path) => `${APP_ORIGIN}${path}`;
    return [
      // One canonical host: www -> apex
      { source: "/:path*", has: [{ type: "host", value: "www.runwaytwin.com" }], destination: "https://runwaytwin.com/:path*", permanent: true },
      { source: "/shop-the-look", destination: to("/OutfitBreakdown"), permanent: false },
      { source: "/app", destination: to("/"), permanent: false },
      { source: "/stylist", destination: to("/AIStylistChat"), permanent: false },
      { source: "/pricing", destination: to("/Pricing"), permanent: false },
      { source: "/terms", destination: to("/Terms"), permanent: false },
      { source: "/privacy", destination: to("/Privacy"), permanent: false },
      { source: "/withdraw", destination: to("/Withdraw"), permanent: false },
      { source: "/looks", destination: to("/SavedLooks"), permanent: false },
      { source: "/lookshare/:code*", destination: to("/"), permanent: false },
      { source: "/products", destination: to("/OutfitBreakdown"), permanent: false },
      { source: "/settings", destination: to("/Profile"), permanent: false },
      { source: "/careers", destination: "/about", permanent: true },
      { source: "/blog/jlaw-off-duty", destination: "/blog/jennifer-lawrence-off-duty", permanent: true },
      { source: "/blog/category/:slug*", destination: "/blog", permanent: true },
      { source: "/blog/page/:n*", destination: "/blog", permanent: true },
      { source: "/disclosure", destination: "/affiliate-disclosure", permanent: true },
    ];
  },
};

module.exports = nextConfig;
