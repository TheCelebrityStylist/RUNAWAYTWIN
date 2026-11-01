import type { Metadata } from 'next';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Questions, press or partnerships? Contact the RunwayTwin team.',
  alternates: { canonical: 'https://runwaytwin.com/contact' },
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-14">
      <h1 className="font-serif text-4xl tracking-tight">Contact</h1>
      <p className="mt-3 max-w-2xl text-neutral-700">
        Questions, press, partnerships — drop us a note and we’ll get back within 1–2 business days.
      </p>
      <div className="mt-8">
        <ContactForm />
      </div>
    </main>
  );
}
