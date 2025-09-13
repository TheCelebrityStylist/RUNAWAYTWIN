import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    // Configure SMTP transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 465, // or 587
      secure: true, // true for 465, false for 587
      auth: {
        user: process.env.EMAIL_USER, // set in Vercel env vars
        pass: process.env.EMAIL_PASS, // set in Vercel env vars
      },
    });

    // Send email
    await transporter.sendMail({
      from: `"RunwayTwin Contact" <${process.env.EMAIL_USER}>`,
      to: "yourname@yourdomain.com", // where you want to receive messages
      replyTo: email,
      subject: `New message from ${name}`,
      text: message,
      html: `<p><b>Name:</b> ${name}</p>
             <p><b>Email:</b> ${email}</p>
             <p><b>Message:</b><br/>${message}</p>`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
