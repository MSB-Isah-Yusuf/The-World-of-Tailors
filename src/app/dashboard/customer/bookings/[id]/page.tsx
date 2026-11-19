import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { minorToMajorString } from "@/lib/payments/money";
import { TailoringPaymentActions } from "@/components/payments/TailoringPaymentActions";
import Link from "next/link";
import { FulfillmentConfirmationButton } from "@/components/payments/FulfillmentConfirmationButton";
import { CustomerRefundRequest } from "@/components/payments/CustomerRefundRequest";
import { CustomerDisputeRequest } from "@/components/payments/CustomerDisputeRequest";

function money(minor: bigint | null | undefined, currency = "NGN") {
  if (minor == null) return "—";
  const value = minorToMajorString(minor);
  return currency === "NGN" ? `₦${Number(value).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${value} ${currency}`;
}

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["CUSTOMER"]);
  const { id } = await params;
  const session = await auth();
  const uid = String((session as any)?.user?.id || "");
  let booking: any = null;
  try {
    booking = await prisma.tailoringBooking.findUnique({ where: { id }, include: {
      tailor: { select: { businessName: true, slug: true } },
      design: { select: { title: true, slug: true } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      notes: { orderBy: { createdAt: "desc" }, take: 5 },
    } });
  } catch (error: any) {
    // Allow customers to review a legacy booking during a staged schema rollout;
    // quote/payment fields stay absent until their migration has been applied.
    if (error?.code === "P2022") {
      try {
        booking = await prisma.tailoringBooking.findUnique({ where: { id }, select: {
          id: true, reference: true, customerId: true, tailorId: true, designId: true,
          description: true, status: true, estimatedCompletion: true, agreedPrice: true,
          paymentStatus: true,
          tailor: { select: { businessName: true, slug: true } },
          design: { select: { title: true, slug: true } },
          statusHistory: { orderBy: { createdAt: "asc" } },
          notes: { orderBy: { createdAt: "desc" }, take: 5 },
        } });
      } catch {}
    }
  }
  if (!booking || booking.customerId !== uid) return <div className="p-8 text-sm dark:text-ivory">Booking not found or not yours.</div>;

  const obligation: any = await prisma.paymentObligation.findFirst({ where: { bookingId: id }, orderBy: { createdAt: "desc" }, include: { payments: { select: { id: true, status: true, category: true, amountMinor: true, createdAt: true, refunds: { select: { id: true, amountMinor: true, status: true, reference: true } } } } } }).catch(() => null);
  const quoteDetails: any = booking.quoteDetails || {};
  const canAcceptQuote = booking.status === "ACCEPTED" && booking.quoteStatus === "SENT" && (!booking.quoteExpiresAt || booking.quoteExpiresAt.getTime() > Date.now()) && !obligation;
  const canPayBalance = booking.status === "ACCEPTED" && booking.quoteStatus === "ACCEPTED" && obligation?.status === "PARTIALLY_PAID" && BigInt(obligation.outstandingMinor) > 0n;

  return <div className="space-y-6 max-w-4xl">
    <div className="flex flex-wrap justify-between gap-3"><div><h1 className="font-display text-2xl dark:text-ivory">{booking.reference} • {booking.tailor?.businessName}</h1><p className="text-sm text-muted-foreground dark:text-ivory/60">Tailor: <Link href={`/tailors/${booking.tailor?.slug}`} className="underline dark:text-gold">{booking.tailor?.businessName}</Link> • Design: {booking.design?.title || "Bespoke"} • Measurement snapshot frozen at request</p></div><div className="flex gap-2 items-start"><Badge variant={booking.status === "COMPLETED" ? "success" : booking.status === "REQUESTED" ? "warning" : "secondary"}>{booking.status}</Badge><Badge variant={booking.paymentStatus === "FULLY_PAID" || booking.paymentStatus === "PAID" ? "success" : "outline"}>{booking.paymentStatus}</Badge></div></div>

    {(booking.quoteStatus === "SENT" || booking.quoteStatus === "ACCEPTED") && <Card className="dark:bg-white/[0.04] dark:border-white/10"><CardHeader><CardTitle className="text-sm dark:text-ivory">Tailoring quotation • {booking.quoteStatus}</CardTitle><p className="text-xs text-muted-foreground">{booking.quoteExpiresAt ? `Expires ${new Date(booking.quoteExpiresAt).toLocaleString()}` : "No expiry set"}</p></CardHeader><CardContent className="space-y-3 dark:text-ivory">
      {quoteDetails.description && <p className="text-sm">{quoteDetails.description}</p>}
      {quoteDetails.garmentDetails && <p className="text-sm"><strong>Garment:</strong> {quoteDetails.garmentDetails}</p>}
      {quoteDetails.fabricRequirements && <p className="text-sm"><strong>Fabric:</strong> {quoteDetails.fabricRequirements}</p>}
      <div className="grid sm:grid-cols-2 gap-2 text-sm">
        <div className="flex justify-between"><span>Service</span><span>{money(quoteDetails.serviceAmountMinor ? BigInt(quoteDetails.serviceAmountMinor) : null)}</span></div>
        <div className="flex justify-between"><span>Delivery</span><span>{money(quoteDetails.deliveryChargeMinor ? BigInt(quoteDetails.deliveryChargeMinor) : 0n)}</span></div>
        <div className="flex justify-between"><span>Additional charges</span><span>{money(quoteDetails.additionalChargesMinor ? BigInt(quoteDetails.additionalChargesMinor) : 0n)}</span></div>
        <div className="flex justify-between"><span>Discount</span><span>−{money(quoteDetails.discountMinor ? BigInt(quoteDetails.discountMinor) : 0n)}</span></div>
        <div className="flex justify-between border-t pt-2 font-semibold"><span>Quoted total</span><span>{money(booking.agreedAmountMinor)}</span></div>
        <div className="flex justify-between border-t pt-2"><span>Initial deposit</span><span>{money(booking.depositAmountMinor)}</span></div>
      </div>
      {quoteDetails.terms && <p className="rounded-lg border p-3 text-xs"><strong>Terms:</strong> {quoteDetails.terms}</p>}
      {quoteDetails.cancellationTerms && <p className="text-xs"><strong>Cancellation:</strong> {quoteDetails.cancellationTerms}</p>}
      <TailoringPaymentActions bookingId={booking.id} canAcceptQuote={canAcceptQuote} canPayBalance={canPayBalance} />
    </CardContent></Card>}

    <div className="grid md:grid-cols-3 gap-4">
      <Card className="dark:bg-white/[0.05] dark:border-white/10"><CardHeader><CardTitle className="text-sm dark:text-ivory">Agreed Price</CardTitle></CardHeader><CardContent className="dark:text-ivory">{booking.agreedAmountMinor != null ? money(booking.agreedAmountMinor) : booking.agreedPrice ? `₦${Number(booking.agreedPrice).toLocaleString()}` : "Awaiting quotation"}</CardContent></Card>
      <Card className="dark:bg-white/[0.05] dark:border-white/10"><CardHeader><CardTitle className="text-sm dark:text-ivory">Payment Summary</CardTitle></CardHeader><CardContent className="space-y-1 text-sm dark:text-ivory"><div className="flex justify-between"><span>Paid</span><span>{money(obligation?.paidMinor)}</span></div><div className="flex justify-between"><span>Outstanding</span><span>{money(obligation?.outstandingMinor)}</span></div></CardContent></Card>
      <Card className="dark:bg-white/[0.05] dark:border-white/10"><CardHeader><CardTitle className="text-sm dark:text-ivory">Est. Completion</CardTitle></CardHeader><CardContent className="dark:text-ivory">{booking.estimatedCompletion ? new Date(booking.estimatedCompletion).toLocaleDateString() : "TBD"}</CardContent></Card>
    </div>

    {obligation?.payments?.length > 0 && <Card className="dark:bg-white/[0.04] dark:border-white/10"><CardHeader><CardTitle className="text-sm dark:text-ivory">Payment transactions & requests</CardTitle></CardHeader><CardContent className="space-y-3 text-xs dark:text-ivory">{obligation.payments.map((payment: any) => { const gross = BigInt(payment.amountMinor || 0); const netRefunded = (payment.refunds || []).reduce((sum: bigint, refund: any) => sum + (refund.status === "SUCCESS" ? BigInt(refund.amountMinor) : refund.status === "REVERSED" ? -BigInt(refund.amountMinor) : 0n), 0n); const remaining = gross - netRefunded; return <div key={payment.id} className="border-b dark:border-white/10 py-2"><div className="flex justify-between"><span>{payment.category} • {payment.status}</span><span>{money(payment.amountMinor)} • {new Date(payment.createdAt).toLocaleString()}</span></div>{(payment.refunds || []).map((refund: any) => <div key={refund.id} className="mt-1 text-[11px] text-muted-foreground">Refund {refund.reference} • {money(refund.amountMinor)} • {refund.status}</div>)}{["PAID", "PARTIALLY_REFUNDED"].includes(String(payment.status)) && remaining > 0n && <><details className="mt-2"><summary className="cursor-pointer underline">Request a refund</summary><CustomerRefundRequest paymentId={payment.id} remainingAmount={minorToMajorString(remaining)} /></details><details className="mt-2"><summary className="cursor-pointer underline">Report a payment dispute</summary><CustomerDisputeRequest paymentId={payment.id} /></details></>}</div>; })}</CardContent></Card>}

    <Card className="dark:bg-white/[0.04] dark:border-white/10"><CardHeader><CardTitle className="text-sm dark:text-ivory">Status history • {booking.statusHistory?.length || 0} events</CardTitle></CardHeader><CardContent className="space-y-1 text-xs dark:text-ivory">{(booking.statusHistory || []).length ? booking.statusHistory.map((entry: any) => <div key={entry.id} className="flex justify-between border-b dark:border-white/10 py-2"><span>{entry.fromStatus || "—"} → {entry.toStatus} {entry.message ? `• ${entry.message.slice(0, 60)}` : ""}</span><span className="text-muted-foreground dark:text-ivory/50">{new Date(entry.createdAt).toLocaleString()}</span></div>) : <div className="text-muted-foreground dark:text-ivory/50">No transitions yet.</div>}</CardContent></Card>
    {booking.fulfillmentConfirmedAt ? <Card className="dark:bg-white/[0.04] dark:border-white/10"><CardContent className="p-3 text-sm dark:text-ivory">Customer completion confirmation recorded {new Date(booking.fulfillmentConfirmedAt).toLocaleString()}.</CardContent></Card> : booking.status === "COMPLETED" && ["FULLY_PAID", "PAID"].includes(String(booking.paymentStatus)) ? <Card className="dark:bg-white/[0.04] dark:border-white/10"><CardContent className="p-4"><FulfillmentConfirmationButton kind="TAILORING_BOOKING" recordId={booking.id} /></CardContent></Card> : null}
    <Card className="dark:bg-white/[0.04] dark:border-white/10"><CardHeader><CardTitle className="text-sm dark:text-ivory">Description</CardTitle></CardHeader><CardContent className="text-sm dark:text-ivory/80">{booking.description || "—"}</CardContent></Card>
    <Link href="/dashboard/customer/bookings" className="text-sm underline dark:text-gold">← Back to bookings</Link>
  </div>;
}
