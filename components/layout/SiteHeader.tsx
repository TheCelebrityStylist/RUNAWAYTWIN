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

  const closeMenu = () => setMenuOpen(false);
  const toggleMenu = () => setMenuOpen((open) => !open);

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        closeMenu();
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
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
    <header className="sticky top-0 z-40 border-b border-[var(--rt-border)]/70 bg-[var(--rt-ivory)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--rt-ivory)]/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:gap-6 md:px-6">
        <div className="flex items-center gap-3 md:gap-4">
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

        <nav
          className="hidden items-center gap-2.5 text-[12px] font-medium text-[var(--rt-muted)] md:flex"
          aria-label="Primary"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center rounded-full border px-4 py-1.5 transition ${
                item.active
                  ? "border-[var(--rt-charcoal)] bg-[var(--rt-charcoal)] text-white shadow-sm"
                  : "border-transparent hover:border-[var(--rt-border)] hover:bg-white/80 hover:text-[var(--rt-charcoal)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/stylist"
            className="inline-flex items-center rounded-full border border-[var(--rt-border)] bg-white px-4 py-1.5 text-[12px] font-semibold text-[var(--rt-charcoal)] shadow-sm transition hover:-translate-y-[1px] hover:border-[var(--rt-charcoal)]/40 hover:shadow-[0_12px_28px_rgba(15,23,42,0.14)]"
          >
            ✨ Try the stylist
          </Link>
          <AccountMenu variant="header" onRequestAuth={closeMenu} />
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--rt-border)] bg-white text-[var(--rt-charcoal)] shadow-sm transition hover:-translate-y-[1px] hover:border-[var(--rt-charcoal)]/35 md:hidden"
          onClick={toggleMenu}
          aria-expanded={menuOpen}
          aria-label="Open navigation"
        >
          {menuOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12" />
              <path d="M18 6l-12 12" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
            onClick={closeMenu}
          />
          <div
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col overflow-hidden border-l border-[var(--rt-border)] bg-[var(--rt-ivory)]/95 shadow-[0_30px_70px_rgba(15,23,42,0.26)] backdrop-blur"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-[var(--rt-border)] px-5 py-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.32em] text-[var(--rt-muted)]">Navigate</p>
                <p className="text-sm font-semibold text-[var(--rt-charcoal)]">Where to next?</p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--rt-border)] bg-white text-[var(--rt-charcoal)] shadow-sm"
                onClick={closeMenu}
                aria-label="Close navigation"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 6l12 12" />
                  <path d="M18 6l-12 12" />
                </svg>
              </button>
            </div>

            <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="space-y-3 text-base font-medium">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-2xl border px-4 py-3 transition ${
                        item.active
                          ? "border-[var(--rt-charcoal)] bg-[var(--rt-charcoal)] text-white shadow-sm"
                          : "border-[var(--rt-border)] bg-white/95 text-[var(--rt-charcoal)] hover:border-[var(--rt-charcoal)]/40"
                      }`}
                      onClick={closeMenu}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="space-y-4 border-t border-[var(--rt-border)] px-5 py-5">
              <Link
                href="/stylist"
                className="btn w-full justify-center"
                onClick={closeMenu}
              >
                ✨ Try the stylist
              </Link>
              <div className="rounded-2xl border border-[var(--rt-border)] bg-white/92 px-4 py-4 text-[13px] text-[var(--rt-charcoal)] shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
                <p className="font-semibold">Your account</p>
                <p className="mt-1 leading-relaxed text-[var(--rt-muted)]">
                  Sign in or join RunwayTwin to save looks, preferences, and billing details.
                </p>
                <div className="mt-4">
                  <AccountMenu
                    onRequestAuth={closeMenu}
                    onPanelOpenChange={(open) => {
                      if (open) closeMenu();
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
