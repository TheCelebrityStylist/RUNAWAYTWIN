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
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = original;
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
    <header className="sticky top-0 z-40 border-b border-[var(--rt-border)] bg-[var(--rt-ivory)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--rt-ivory)]/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-[20px] font-semibold tracking-tight text-[var(--rt-charcoal)] transition hover:opacity-80"
            aria-label="RunwayTwin Home"
          >
            RunwayTwin
          </Link>
          <span className="hidden text-[11px] font-medium uppercase tracking-[0.32em] text-[var(--rt-muted)] sm:inline">
            AI Stylist Concierge
          </span>
        </div>

        <nav className="hidden items-center gap-6 text-[13px] font-medium text-[var(--rt-muted)] md:flex" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition hover:text-[var(--rt-charcoal)] ${
                item.active ? "text-[var(--rt-charcoal)] font-semibold" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <AccountMenu />
          <Link
            href="/stylist"
            className="btn h-10 px-5 text-sm"
          >
            Try the stylist
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--rt-border)] bg-white text-[var(--rt-charcoal)] shadow-sm transition hover:border-[var(--rt-charcoal)]/35 md:hidden"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-label="Open navigation"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden">
          <div className="fixed inset-0 z-40 bg-black/35" aria-hidden="true" onClick={() => setMenuOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-[84%] max-w-sm flex-col gap-6 border-l border-[var(--rt-border)] bg-[var(--rt-ivory)] px-5 py-6 shadow-[0_26px_70px_rgba(15,23,42,0.2)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--rt-muted)]">Navigate</p>
                <p className="text-sm font-semibold text-[var(--rt-charcoal)]">Where to next?</p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--rt-border)] bg-white text-[var(--rt-charcoal)]"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 6l12 12" />
                  <path d="M18 6l-12 12" />
                </svg>
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
                          ? "border-[var(--rt-charcoal)] bg-[var(--rt-charcoal)] text-white"
                          : "border-[var(--rt-border)] bg-white text-[var(--rt-charcoal)] hover:border-[var(--rt-charcoal)]/45"
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
              <Link href="/stylist" className="btn w-full justify-center" onClick={() => setMenuOpen(false)}>
                ✨ Try the stylist
              </Link>
              <div className="rounded-2xl border border-[var(--rt-border)] bg-white/90 px-4 py-4 text-[13px] text-[var(--rt-charcoal)]">
                <p className="font-semibold">Your account</p>
                <p className="mt-1 leading-relaxed text-[var(--rt-muted)]">
                  Sign in or join RunwayTwin to save looks, preferences, and billing details.
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
