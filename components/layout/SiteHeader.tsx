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
    <header className="sticky top-0 z-50 border-b border-[var(--rt-border)] bg-[#FDFBF7]/85 backdrop-blur supports-[backdrop-filter]:bg-[#FDFBF7]/75">
      <div className="mx-auto flex h-[78px] max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-[21px] font-semibold tracking-tight text-[var(--rt-charcoal)] transition hover:opacity-80"
            aria-label="RunwayTwin Home"
          >
            RunwayTwin
          </Link>
          <span className="hidden text-[11px] font-medium uppercase tracking-[0.32em] text-[var(--rt-muted)] sm:inline">
            AI Stylist Concierge
          </span>
        </div>

        <nav
          aria-label="Primary"
          className="hidden lg:flex h-12 items-center gap-1 rounded-full border border-[var(--rt-border)] bg-white/80 px-2 shadow-[0_14px_32px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3.5 py-2 text-[13px] font-medium transition ${
                item.active
                  ? "bg-[var(--rt-charcoal)] text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)]"
                  : "text-[var(--rt-muted)] hover:bg-black/5 hover:text-[var(--rt-charcoal)]"
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
            className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--rt-charcoal)] px-5 text-[13px] font-semibold tracking-tight text-white shadow-[0_18px_34px_rgba(15,23,42,0.22)] transition hover:opacity-90"
          >
            Try the Stylist
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex items-center rounded-full border border-[var(--rt-border)] bg-white/90 px-3.5 py-2 text-sm font-medium text-[var(--rt-charcoal)] shadow-sm transition hover:bg-white md:hidden"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-label="Open navigation"
        >
          Menu
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden">
          <div className="fixed inset-0 z-40 bg-black/35" aria-hidden="true" onClick={() => setMenuOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-[82%] max-w-sm flex-col gap-6 border-l border-[var(--rt-border)] bg-[#FDFBF7] px-5 py-6 shadow-[0_26px_70px_rgba(15,23,42,0.24)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--rt-muted)]">Navigate</p>
                <p className="text-sm font-semibold text-[var(--rt-charcoal)]">Where to next?</p>
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
                          ? "border-[var(--rt-charcoal)] bg-[var(--rt-charcoal)] text-white"
                          : "border-[var(--rt-border)] bg-white text-[var(--rt-charcoal)] hover:border-[var(--rt-charcoal)]/60"
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
