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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200/70 bg-white/80 px-3 py-1 text-[11px] font-medium text-neutral-700 shadow-sm">
      {children}
    </span>
  );
}

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
    <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-[#FAF9F6]/90 backdrop-blur supports-[backdrop-filter]:bg-[#FAF9F6]/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-base font-semibold tracking-tight hover:opacity-80" aria-label="RunwayTwin Home">
            RunwayTwin
          </Link>
          <div className="hidden items-center gap-2 lg:flex">
            <Badge>Editorial Taste</Badge>
            <Badge>Body-Type Flattering</Badge>
            <Badge>Budget-True</Badge>
          </div>
        </div>

        <nav aria-label="Main" className="hidden md:flex">
          <ul className="flex items-center gap-6 text-sm">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`transition-colors hover:underline underline-offset-4 ${
                    item.active ? "text-black" : "text-neutral-700"
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
            className="hidden items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 lg:inline-flex"
          >
            ✨ Try the Stylist
          </Link>
        </div>

        <div className="flex items-center gap-3 md:hidden">
          <button
            type="button"
            className="rounded-full border px-3 py-1.5 text-sm font-medium"
            style={{ borderColor: "var(--rt-border)", background: "white" }}
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-label="Open navigation"
          >
            Menu
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/30">
          <div className="absolute inset-y-0 right-0 flex w-full max-w-xs flex-col border-l border-neutral-200 bg-[#FAF9F6] shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <span className="text-sm font-semibold tracking-tight">Menu</span>
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-sm"
                style={{ borderColor: "var(--rt-border)", background: "white" }}
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation"
              >
                Close
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-5 py-6" aria-label="Mobile">
              <ul className="space-y-4 text-base font-medium">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-full px-4 py-2 transition ${
                        item.active
                          ? "bg-black text-white"
                          : "border border-neutral-200 bg-white text-neutral-800"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="border-t border-neutral-200 px-5 py-5">
              <Link href="/stylist" className="btn mb-4 w-full justify-center" onClick={() => setMenuOpen(false)}>
                ✨ Try the Stylist
              </Link>
              <div className="relative pb-8">
                <AccountMenu />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
