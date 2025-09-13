'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [status, setStatus] = useState<'idle'|'sending'|'ok'|'err'>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      message: (form.elements.namedItem('message') as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      form.reset();
      setStatus('ok');
    } catch {
      setStatus('err');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl flex-col gap-3">
      <input name="name" required placeholder="Full name" className="rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-800"/>
      <input name="email" required type="email" placeholder="you@example.com" className="rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-800"/>
      <textarea name="message" required placeholder="How can we help?" rows={5} className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-800"/>
      <button disabled={status==='sending'} className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {status==='sending' ? 'Sending…' : 'Send message'}
      </button>
      {status==='ok' && <p className="text-sm text-emerald-700">Thanks! We’ll reply soon.</p>}
      {status==='err' && <p className="text-sm text-red-600">Something went wrong. Please try again.</p>}
    </form>
  );
}
