import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentConfigurationError, getPaymentRuntimeConfig } from "@/lib/payments/config";
import { verifyPaystackWebhookSignature, verifyPaystackTransaction, verifyPaystackTransfer } from "@/lib/paystack";
import { verifyAndSettlePayment } from "@/lib/payments/verify-and-settle";
import { applyVerifiedPaystackTransfer } from "@/lib/payments/paystack-transfers";

export const runtime = "nodejs";

function text(value: unknown): string | null {
  return value == null ? null : String(value).slice(0, 180);
}

function safePayload(eventType: string, data: any) {
  // Explicit allowlist: raw webhook payloads can contain customer and recipient details.
  return {
    event: eventType,
    data: {
      id: text(data?.id),
      reference: text(data?.reference),
      status: text(data?.status),
      amount: Number.isSafeInteger(data?.amount) ? String(data.amount) : null,
      currency: text(data?.currency),
      fees: Number.isSafeInteger(data?.fees) ? String(data.fees) : null,
      paid_at: text(data?.paid_at),
      transfer_code: text(data?.transfer_code),
      refund_reference: text(data?.refund_reference || data?.reference),
    },
  };
}

async function storeEvent({ eventId, eventType, reference, payloadHash, payload }: {
  eventId: string; eventType: string; reference: string | null; payloadHash: string; payload: any;
}) {
  try {
    return await prisma.paymentWebhookEvent.create({ data: {
      provider: "paystack", eventId, eventType, transactionReference: reference,
      payloadHash, signatureVerified: true, processingStatus: "RECEIVED", payload,
    } });
  } catch (error: any) {
    if (error?.code !== "P2002") throw error;
    return prisma.paymentWebhookEvent.findUnique({ where: { eventId } });
  }
}

export async function POST(req: NextRequest) {
  const rawBody = Buffer.from(await req.arrayBuffer());
  let config;
  try { config = getPaymentRuntimeConfig(); }
  catch (error) {
    const message = error instanceof PaymentConfigurationError ? error.message : "Payment configuration unavailable";
    return NextResponse.json({ error: "PAYMENT_CONFIGURATION_UNAVAILABLE", message }, { status: 503 });
  }

  const signature = verifyPaystackWebhookSignature({
    rawBody,
    currentSignature: req.headers.get("paystack-signature"),
    legacySignature: req.headers.get("x-paystack-signature"),
    signingSecret: config.webhookSigningSecret,
    apiSecret: config.secretKey,
  });
  if (!signature.valid) return NextResponse.json({ error: "INVALID_WEBHOOK_SIGNATURE" }, { status: 401 });

  let event: any;
  try { event = JSON.parse(rawBody.toString("utf8")); }
  catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const eventType = String(event?.event || event?.type || "").slice(0, 80);
  const data = event?.data || {};
  const reference = text(data.reference);
  if (!eventType) return NextResponse.json({ error: "MISSING_EVENT_TYPE" }, { status: 400 });

  const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const stableKey = [eventType, text(data.id) || "no-id", reference || "no-reference"].join("|");
  const eventId = crypto.createHash("sha256").update(stableKey).digest("hex");
  const eventRow: any = await storeEvent({ eventId, eventType, reference, payloadHash, payload: safePayload(eventType, data) }).catch(() => null);
  if (!eventRow) return NextResponse.json({ error: "WEBHOOK_EVENT_STORE_FAILED" }, { status: 500 });
  if (["PROCESSED", "IGNORED", "REVIEW_REQUIRED", "LEGACY_PROCESSED"].includes(eventRow.processingStatus)) return NextResponse.json({ ok: true, duplicate: true });

  try {
    if (eventType === "charge.success" && reference) {
      const attempt = await prisma.paymentAttempt.findUnique({ where: { providerReference: reference }, select: { id: true } });
      if (!attempt) {
        await prisma.paymentWebhookEvent.update({ where: { eventId }, data: { processingStatus: "REVIEW_REQUIRED", errorSummary: "PAYMENT_ATTEMPT_NOT_FOUND" } });
        await prisma.auditLog.create({ data: { action: "PAYSTACK_UNMATCHED_CHARGE", entity: "PaymentWebhookEvent", entityId: eventRow.id, metadata: { eventId, reference } } }).catch(() => {});
        return NextResponse.json({ ok: true, review: true });
      }
      const providerData = await verifyPaystackTransaction(reference);
      const settled = await verifyAndSettlePayment(providerData, "webhook");
      if (!settled.ok) {
        const final = !settled.retryable;
        await prisma.paymentWebhookEvent.update({ where: { eventId }, data: { processingStatus: final ? "REVIEW_REQUIRED" : "RETRYABLE", errorSummary: settled.code } });
        if (!final) return NextResponse.json({ error: "PAYMENT_VERIFICATION_RETRY", code: settled.code }, { status: 500 });
        await prisma.auditLog.create({ data: { action: "PAYSTACK_CHARGE_REQUIRES_REVIEW", entity: "PaymentWebhookEvent", entityId: eventRow.id, metadata: { eventId, reference, code: settled.code } } }).catch(() => {});
        return NextResponse.json({ ok: true, review: true });
      }
      await prisma.paymentWebhookEvent.update({ where: { eventId }, data: { processed: true, processingStatus: settled.duplicateCapture ? "REVIEW_REQUIRED" : "PROCESSED", processedAt: new Date(), errorSummary: settled.duplicateCapture ? "DUPLICATE_CAPTURE" : null } });
      return NextResponse.json({ ok: true, status: settled.status, duplicateCapture: !!settled.duplicateCapture });
    }

    if (["transfer.success", "transfer.failed", "transfer.reversed"].includes(eventType) && reference) {
      const providerTransfer = await verifyPaystackTransfer(reference);
      const result = await applyVerifiedPaystackTransfer(reference, providerTransfer, eventId);
      await prisma.paymentWebhookEvent.update({ where: { eventId }, data: { processed: result.final, processingStatus: result.status, errorSummary: result.error || null, processedAt: result.final ? new Date() : null } });
      if (!result.final) return NextResponse.json({ error: "TRANSFER_VERIFICATION_RETRY", status: result.status }, { status: 500 });
      return NextResponse.json({ ok: true, status: result.status });
    }

    // Paystack currently documents charge.success as the charge completion webhook. Failed/pending
    // payment attempts are resolved through the authenticated verification endpoint instead.
    await prisma.paymentWebhookEvent.update({ where: { eventId }, data: { processed: true, processingStatus: "IGNORED", processedAt: new Date() } });
    return NextResponse.json({ ok: true, ignored: eventType });
  } catch (error: any) {
    await prisma.paymentWebhookEvent.update({ where: { eventId }, data: { processingStatus: "RETRYABLE", errorSummary: "PROVIDER_OR_DATABASE_RETRY" } }).catch(() => {});
    console.error("[paystack-webhook] processing failure", String(error?.name || "Error"));
    return NextResponse.json({ error: "WEBHOOK_PROCESSING_RETRY" }, { status: 500 });
  }
}
