"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function Header() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={`sticky top-0 z-50 transition-all ${
        scrolled ? "backdrop-blur bg-white/70 border-b border-zinc-200/70" : "bg-transparent"
      }`}
      aria-label="Site header"
    >
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3" aria-label="RunwayTwin Home">
          <div className="h-9 w-9 grid place-items-center rounded-full bg-black text-white font-semibold">RT</div>
          <div>
            <div className="font-display text-lg leading-5">RunwayTwin</div>
            <div className="text-xs text-zinc-500">Be Their Runway Twin ✨</div>
          </div>
        </Link>

        <nav className="flex items-center gap-7 text-sm">
          <Link className={`hover:text-black ${path==="/stylist"?"text-black":"text-zinc-600"}`} href="/stylist">Stylist</Link>
          <Link className={`hover:text-black ${path==="/about"?"text-black":"text-zinc-600"}`} href="/about">About</Link>
          <Link className={`hover:text-black ${path==="/blog"?"text-black":"text-zinc-600"}`} href="/blog">Blog</Link>
          <Link className={`hover:text-black ${path==="/pricing"?"text-black":"text-zinc-600"}`} href="/pricing">Pricing</Link>
          <Link href="/upgrade" className="btn">Upgrade</Link>
        </nav>
      </div>
    </header>
  );
}
