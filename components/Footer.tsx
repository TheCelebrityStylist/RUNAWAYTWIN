export default function Footer() {
  return (
    <footer className="mt-20 border-t">
      <div className="mx-auto max-w-6xl px-6 py-10 grid gap-6 sm:grid-cols-3">
        <div className="space-y-2">
          <div className="text-lg font-display">RunwayTwin</div>
          <p className="text-sm text-rt-charcoal/80">Celebrity stylist AI — curated looks with working shop links.</p>
        </div>
        <div className="text-sm space-y-2">
          <div className="font-medium">Company</div>
          <a href="/about" className="block hover:text-rt-gold">About</a>
          <a href="/careers" className="block hover:text-rt-gold">Careers</a>
          <a href="/contact" className="block hover:text-rt-gold">Contact</a>
        </div>
        <div className="text-sm space-y-2">
          <div className="font-medium">Legal</div>
          <a href="/terms" className="block hover:text-rt-gold">Terms</a>
          <a href="/privacy" className="block hover:text-rt-gold">Privacy</a>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 pb-10 text-xs text-rt-charcoal/70">
        © {new Date().getFullYear()} RunwayTwin — All rights reserved.
      </div>
    </footer>
  );
}
