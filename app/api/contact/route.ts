// app/api/contact/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // ensure Node runtime for nodemailer

type Body = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  hp?: string; // honeypot
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    // Simple spam trap
    if (body.hp) {
      return NextResponse.json({ ok: true });
    }

    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const subject = (body.subject || "New contact form").trim();
    const message = (body.message || "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    // Lazy import to keep build clean even if types hiccup
    const { default: nodemailer } = await import("nodemailer");

    const host = process.env.SMTP_HOST!;
    const port = Number(process.env.SMTP_PORT || 465);
    const user = process.env.SMTP_USER!;
    const pass = process.env.SMTP_PASS!;
    const to = process.env.CONTACT_TO || user;
    const from = process.env.CONTACT_FROM || user;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // Hostinger uses 465 (SSL) most of the time
      auth: { user, pass }
    });

    // optional but helpful
    await transporter.verify();

    const text = `New message from RunwayTwin contact form

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
`;

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;line-height:1.6">
        <p><strong>New message from RunwayTwin contact form</strong></p>
        <p><strong>Name:</strong> ${escapeHtml(name)}<br/>
        <strong>Email:</strong> ${escapeHtml(email)}<br/>
        <strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <p><strong>Message:</strong><br/>${nl2br(escapeHtml(message))}</p>
      </div>
    `;

    const info = await transporter.sendMail({
      from,
      to,
      replyTo: email,
      subject: `[Contact] ${subject} — ${name}`,
      text,
      html
    });

    return NextResponse.json({ ok: true, id: info.messageId });
  } catch (err: any) {
    console.error("Contact route error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}

// helpers
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function nl2br(s: string) {
  return s.replace(/\n/g, "<br/>");
}


