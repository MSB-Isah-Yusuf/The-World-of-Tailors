type EmailArgs = { to: string; subject: string; html: string; text?: string };

export async function sendEmail({ to, subject, html }: EmailArgs) {
  const provider = (process.env.EMAIL_PROVIDER || "console").toLowerCase();
  if (provider === "resend" && process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.EMAIL_FROM || "noreply@twt.ng", to, subject, html }),
      });
      if (!res.ok) console.warn("[email][resend] failed", await res.text());
      else console.log(`[email] sent to ${to} via resend`);
      return;
    } catch (e) { console.warn("[email] resend error", e); }
  }
  // console provider (default, safe for dev/Vercel without keys)
  console.log(`[email:console] to=${to} subject=${subject}\n${html.slice(0,500)}`);
}

export async function notifyBookingStatus({ customerEmail, reference, from, to }: { customerEmail: string; reference: string; from: string; to: string }) {
  await sendEmail({ to: customerEmail, subject: `Your booking ${reference} is now ${to}`, html: `<p>Booking <b>${reference}</b> moved <b>${from} → ${to}</b>.</p><p>Track it at ${process.env.AUTH_URL || ""}/dashboard/customer/bookings</p>` });
}
