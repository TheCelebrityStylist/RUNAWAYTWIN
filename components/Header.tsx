"use client";

export default function Header() {
  return (
    <header className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
      <a href="/" className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-rt-black text-white font-semibold">RT</div>
        <div>
          <div className="text-lg font-display tracking-tight">RunwayTwin</div>
          <div className="text-xs text-rt-charcoal/70">Be Their Runway Twin ✨</div>
        </div>
      </a>
      <nav className="flex items-center gap-5 text-sm">
        <a href="/stylist" className="hover:text-rt-gold">Stylist</a>
        <a href="/about" className="hover:text-rt-gold">About</a>
        <a href="/blog" className="hover:text-rt-gold">Blog</a>
        <a href="/upgrade" className="btn ml-2">Upgrade</a>
      </nav>
    </header>
  );
}
