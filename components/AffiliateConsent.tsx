"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const KEY = "rt_affiliate_consent"; // "yes" | "no"

function read(): string | null {
  try { return window.localStorage.getItem(KEY); } catch { return null; }
}
function write(v: string) {
  try { window.localStorage.setItem(KEY, v); } catch {}
}

/**
 * Skimlinks sets affiliate-tracking cookies, so under the Dutch Telecommunicatiewet (art. 11.7a)
 * it only loads after the visitor says yes. "No" is as easy as "yes" and the choice can be changed
 * from the footer link (which dispatches "rt:cookie-settings").
 */
export default function AffiliateConsent() {
  const [choice, setChoice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setChoice(read());
    setReady(true);
    const reopen = () => setChoice(null);
    window.addEventListener("rt:cookie-settings", reopen);
    return () => window.removeEventListener("rt:cookie-settings", reopen);
  }, []);

  const decide = (v: "yes" | "no") => { write(v); setChoice(v); };

  return (
    <>
      {choice === "yes" && (
        <Script src="https://s.skimresources.com/js/313588X1802335.skimlinks.js" strategy="afterInteractive" />
      )}
      {ready && choice === null && (
        <div role="dialog" aria-live="polite" aria-label="Cookie choice"
          className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4">
          <div className="mx-auto max-w-2xl rounded-2xl border border-neutral-200 bg-white p-4 shadow-lg sm:flex sm:items-center sm:gap-4">
            <p className="text-[13px] leading-relaxed text-neutral-700">
              When you click through to a shop, an affiliate cookie lets the shop see you came from us. We may earn a
              commission; you pay the same price. No ads, no profiling.{" "}
              <a href="/affiliate-disclosure" className="underline">More</a>
            </p>
            <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
              <button onClick={() => decide("no")}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-[13px] font-medium text-neutral-800 hover:bg-neutral-50">
                No thanks
              </button>
              <button onClick={() => decide("yes")}
                className="rounded-xl bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-neutral-800">
                Fine
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" className={className}
      onClick={() => window.dispatchEvent(new Event("rt:cookie-settings"))}>
      Cookie settings
    </button>
  );
}
