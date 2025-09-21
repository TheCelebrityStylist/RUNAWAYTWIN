"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import AccountMenu from "@/components/account/AccountMenu";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/stylist", label: "Stylist" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Journal" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [menuOpen]);

  const navItems = useMemo(
    () =>
      NAV_ITEMS.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return { ...item, active };
      }),
    [pathname]
  );

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--rt-border)] bg-[#FAF9F6]/80 backdrop-blur supports-[backdrop-filter]:bg-[#FAF9F6]/70">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 md:px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-[20px] font-semibold tracking-tight text-[var(--rt-charcoal)] transition hover:opacity-80"
            aria-label="RunwayTwin Home"
          >
            RunwayTwin
          </Link>
          <span className="hidden text-[11px] font-medium uppercase tracking-[0.38em] text-[var(--rt-muted)] lg:block">
            AI Stylist Concierge
          </span>
        </div>

        <nav aria-label="Main" className="hidden md:flex">
          <ul className="flex items-center gap-1 rounded-full border border-[var(--rt-border)] bg-white/70 px-3 py-1.5 text-sm font-medium text-[var(--rt-charcoal)] shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-full px-3 py-1.5 transition-colors ${
                    item.active
                      ? "bg-black text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]"
                      : "text-[var(--rt-muted)] hover:text-black hover:bg-black/5"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <AccountMenu />
          <Link
            href="/stylist"
            className="inline-flex h-10 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.25)] transition hover:opacity-90"
          >
            Try the Stylist
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex items-center rounded-full border border-[var(--rt-border)] bg-white/90 px-3 py-1.5 text-sm font-medium text-[var(--rt-charcoal)] shadow-sm transition hover:bg-white md:hidden"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-label="Open navigation"
        >
          Menu
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden">
          <div className="fixed inset-0 z-40 bg-black/30" aria-hidden="true" onClick={() => setMenuOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-[86%] max-w-sm flex-col gap-6 border-l border-[var(--rt-border)] bg-[#FAF9F6] px-5 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.38em] text-[var(--rt-muted)]">Navigation</p>
                <p className="text-sm font-semibold text-[var(--rt-charcoal)]">Choose your destination</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-[var(--rt-border)] bg-white/90 px-3 py-1 text-sm font-medium"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation"
              >
                Close
              </button>
            </div>
            <nav aria-label="Mobile" className="flex-1 overflow-y-auto">
              <ul className="space-y-3 text-base font-medium">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-2xl border px-4 py-3 transition ${
                        item.active
                          ? "border-black bg-black text-white"
                          : "border-[var(--rt-border)] bg-white text-[var(--rt-charcoal)] hover:border-black/40"
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="space-y-4 border-t border-[var(--rt-border)] pt-5">
              <Link
                href="/stylist"
                className="btn block w-full justify-center"
                onClick={() => setMenuOpen(false)}
              >
                ✨ Try the Stylist
              </Link>
              <div className="rounded-2xl border border-[var(--rt-border)] bg-white/90 px-4 py-4 text-[13px] text-[var(--rt-charcoal)]">
                <p className="font-semibold">Already styled with us?</p>
                <p className="mt-1 leading-relaxed text-[var(--rt-muted)]">
                  Sign in to retrieve your saved preferences and pinned looks.
                </p>
                <div className="mt-4">
                  <AccountMenu />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
