export default function Footer() {
  return (
    <footer className="mt-20 border-t border-zinc-200/70">
      <div className="mx-auto max-w-7xl px-6 py-12 grid gap-10 sm:grid-cols-4">
        <div>
          <div className="font-display text-lg">RunwayTwin</div>
          <p className="mt-2 text-sm text-zinc-600">
            Celebrity stylist AI — curated looks with working shop links.
          </p>
          <p className="mt-4 text-xs text-zinc-500">
            Disclosure: some outbound links are affiliate links; we may earn a commission at no extra cost to you.
          </p>
        </div>

        <div>
          <div className="text-sm font-semibold">Product</div>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li><a href="/stylist" className="hover:text-black">Stylist</a></li>
            <li><a href="/pricing" className="hover:text-black">Pricing</a></li>
            <li><a href="/blog" className="hover:text-black">Blog</a></li>
          </ul>
        </div>

        <div>
          <div className="text-sm font-semibold">Company</div>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li><a href="/about" className="hover:text-black">About</a></li>
            <li><a href="/careers" className="hover:text-black">Careers</a></li>
            <li><a href="/contact" className="hover:text-black">Contact</a></li>
          </ul>
        </div>

        <div>
          <div className="text-sm font-semibold">Legal</div>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li><a href="/disclosure" className="hover:text-black">Affiliate Disclosure</a></li>
            <li><a href="/terms" className="hover:text-black">Terms</a></li>
            <li><a href="/privacy" className="hover:text-black">Privacy</a></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 pb-10 text-xs text-zinc-500">
        © {new Date().getFullYear()} RunwayTwin — All rights reserved.
      </div>
    </footer>
  );
}
