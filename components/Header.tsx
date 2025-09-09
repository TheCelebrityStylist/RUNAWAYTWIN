"use client";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-rt-black text-white font-semibold">RT</div>
          <div>
            <div className="text-lg font-display tracking-tight">RunwayTwin</div>
            <div className="text-[11px] text-rt-charcoal/70">Be Their Runway Twin ✨</div>
          </div>
        </a>

        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <a className="hover:text-rt-gold" href="/stylist">Stylist</a>
          <a className="hover:text-rt-gold" href="/about">About</a>
          <a className="hover:text-rt-gold" href="/blog">Blog</a>
          <a className="btn ml-1" href="/upgrade">Upgrade</a>
        </nav>
      </div>
    </header>
  );
}
