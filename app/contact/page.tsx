// app/contact/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Contact — RunwayTwin",
  description: "Questions, feedback, partnerships — get in touch."
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#FAF9F6] text-neutral-900 antialiased">
      <section className="mx-auto max-w-2xl px-5 py-14">
        <h1 className="font-serif text-4xl tracking-tight">Contact</h1>
        <p className="mt-3 text-neutral-700">
          We usually reply within one business day.
        </p>

        <form
          className="mt-8 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget as HTMLFormElement;
            const fd = new FormData(form);
            const res = await fetch("/api/contact", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: fd.get("name"),
                email: fd.get("email"),
                subject: fd.get("subject"),
                message: fd.get("message"),
                hp: fd.get("hp") // honeypot
              })
            });
            const data = await res.json();
            if (data.ok) {
              alert("Thanks! Your message has been sent.");
              form.reset();
            } else {
              alert("Sorry — " + (data.error || "something went wrong."));
            }
          }}
        >
          {/* honeypot */}
          <input type="text" name="hp" className="hidden" tabIndex={-1} autoComplete="off" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                name="name"
                required
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input
                type="email"
                name="email"
                required
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Subject</label>
            <input
              name="subject"
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Message</label>
            <textarea
              name="message"
              required
              rows={6}
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-800"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              Send message
            </button>
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
            >
              Back home
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
