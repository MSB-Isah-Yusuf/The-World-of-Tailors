import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyPaystackTransaction } from "@/lib/paystack";
import { verifyAndSettlePayment } from "@/lib/payments/verify-and-settle";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const userId = (session.user as any).id as string;
  const body: any = await req.json().catch(() => ({}));
  const reference = String(body.reference || "").trim();
  if (!reference || reference.length > 64) return NextResponse.json({ error: "A valid Paystack attempt reference is required" }, { status: 400 });

  const attempt: any = await prisma.paymentAttempt.findUnique({ where: { providerReference: reference }, include: { payment: { include: { obligation: true, booking: true, fabricOrder: true } } } });
  if (!attempt) return NextResponse.json({ error: "PAYMENT_ATTEMPT_NOT_FOUND" }, { status: 404 });
  const customerId = attempt.payment.obligation?.customerId || attempt.payment.booking?.customerId || attempt.payment.fabricOrder?.customerId;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && (role !== "CUSTOMER" || customerId !== userId)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  try {
    const providerData = await verifyPaystackTransaction(reference);
    const result = await verifyAndSettlePayment(providerData, "callback");
    if (!result.ok) {
      if (result.code === "NOT_SUCCESSFUL") return NextResponse.json({ ok: false, status: providerData.status, message: result.message, retryable: result.retryable }, { status: 409 });
      await prisma.auditLog.create({ data: { action: "PAYMENT_VERIFICATION_MISMATCH", entity: "Payment", entityId: attempt.paymentId, metadata: { reference, code: result.code, message: result.message } } }).catch(() => {});
      return NextResponse.json({ error: result.code, message: result.message, status: "REVIEW_REQUIRED" }, { status: 409 });
    }
    return NextResponse.json({ ok: true, status: result.status, duplicate: !!result.duplicate, duplicateCapture: !!result.duplicateCapture, paymentId: result.paymentId });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Verification unavailable";
    return NextResponse.json({ error: "VERIFICATION_UNAVAILABLE", message: message.slice(0, 180) }, { status: 502 });
  }
}
