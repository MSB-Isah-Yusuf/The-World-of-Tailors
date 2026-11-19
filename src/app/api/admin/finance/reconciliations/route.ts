import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isSuccess(type: string, status: string) {
  const value = status.toLowerCase();
  return type === "CHARGE" ? value === "success" : type === "REFUND" ? ["processed", "success", "completed"].includes(value) : value === "success";
}
function providerState(type: string, status: string) {
  const value = status.toLowerCase();
  if (isSuccess(type, value)) return "SUCCESS";
  if (["failed", "rejected", "abandoned", "blocked"].includes(value)) return "FAILED";
  if (value === "reversed") return "REVERSED";
  if (["pending", "processing", "queued", "received", "otp"].includes(value)) return "PENDING";
  return `OTHER:${value}`;
}
function localState(type: string, status: string) {
  const value = status.toUpperCase();
  if (value === "PAID" || value === "SUCCESS" || value === "REFUNDED") return "SUCCESS";
  if (["FAILED", "REJECTED", "ABANDONED", "BLOCKED"].includes(value)) return "FAILED";
  if (value === "REVERSED") return "REVERSED";
  if (["PENDING", "PROCESSING", "REQUESTED", "AWAITING_SECOND_APPROVAL", "INITIATING", "TRANSFER_UNKNOWN", "REFUND_UNKNOWN", "REFUND_PENDING", "PARTIALLY_REFUNDED", "PARTIALLY_PAID", "UNPAID", "AWAITING_CUSTOMER", "ONGOING"].includes(value)) return "PENDING";
  return `OTHER:${value.toLowerCase()}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const items: any[] = await prisma.paymentReconciliation.findMany({ include: { _count: { select: { items: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ items: items.map((item) => ({ ...item, internalTotalMinor: String(item.internalTotalMinor), providerTotalMinor: String(item.providerTotalMinor), discrepancyMinor: String(item.discrepancyMinor), itemCount: item._count.items })) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const actorId = String((session.user as any).id || "");
  const body: any = await req.json().catch(() => ({}));
  const start = new Date(String(body.periodStart || ""));
  const end = new Date(String(body.periodEnd || ""));
  const currency = String(body.currency || "NGN").toUpperCase();
  const records: any[] = Array.isArray(body.records) ? body.records : [];
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || currency !== "NGN" || !records.length || records.length > 5000) return NextResponse.json({ error: "Valid period, NGN currency, and 1–5000 provider records are required." }, { status: 400 });
  const normalized = records.map((row) => ({
    recordType: String(row.recordType || "CHARGE").toUpperCase(), reference: String(row.reference || "").trim(),
    providerRecordId: row.providerRecordId == null ? null : String(row.providerRecordId).slice(0, 180),
    providerStatus: String(row.status || "").trim().slice(0, 80),
    amountMinor: String(row.amountMinor || ""), currency: String(row.currency || "NGN").toUpperCase(),
  }));
  if (normalized.some((row) => !["CHARGE", "REFUND", "TRANSFER"].includes(row.recordType) || !row.reference || row.reference.length > 100 || !/^\d{1,18}$/.test(row.amountMinor) || BigInt(row.amountMinor || "0") <= 0n || !Number.isSafeInteger(Number(row.amountMinor)) || !row.providerStatus || row.currency !== "NGN")) return NextResponse.json({ error: "Each row requires recordType, reference, positive safe integer amountMinor, NGN, and status." }, { status: 400 });

  const chargeRefs = [...new Set(normalized.filter((row) => row.recordType === "CHARGE").map((row) => row.reference))];
  const refundRefs = [...new Set(normalized.filter((row) => row.recordType === "REFUND").map((row) => row.reference))];
  const transferRefs = [...new Set(normalized.filter((row) => row.recordType === "TRANSFER").map((row) => row.reference))];
  const [attempts, refunds, payouts, internalPayments] = await Promise.all([
    chargeRefs.length ? prisma.paymentAttempt.findMany({ where: { providerReference: { in: chargeRefs } }, include: { payment: true } }) : [],
    refundRefs.length ? prisma.refund.findMany({ where: { OR: [{ reference: { in: refundRefs } }, { providerRefundReference: { in: refundRefs } }] } }) : [],
    transferRefs.length ? prisma.payout.findMany({ where: { reference: { in: transferRefs } } }) : [],
    prisma.payment.findMany({ where: { status: "PAID", currency, paidAt: { gte: start, lt: end } }, include: { attempts: { where: { status: "SUCCESS" }, orderBy: { attemptNumber: "desc" }, take: 1 } } }),
  ]);
  const attemptByRef = new Map((attempts as any[]).map((attempt: any) => [attempt.providerReference, attempt]));
  const refundByRef = new Map<string, any>(); for (const refund of refunds as any[]) { refundByRef.set(refund.reference, refund); if (refund.providerRefundReference) refundByRef.set(refund.providerRefundReference, refund); }
  const payoutByRef = new Map((payouts as any[]).map((payout: any) => [payout.reference, payout]));
  const counts = new Map<string, number>();
  for (const row of normalized) { const key = `${row.recordType}:${row.reference}`; counts.set(key, (counts.get(key) || 0) + 1); }
  const seenInternalPayments = new Set<string>();
  let providerChargeTotal = 0n;
  for (const row of normalized) if (row.recordType === "CHARGE" && isSuccess(row.recordType, row.providerStatus)) providerChargeTotal += BigInt(row.amountMinor);
  let internalChargeTotal = 0n;
  for (const payment of internalPayments as any[]) if (payment.amountMinor != null) internalChargeTotal += BigInt(payment.amountMinor);

  const items: any[] = normalized.map((row) => {
    const duplicateCount = counts.get(`${row.recordType}:${row.reference}`) || 0;
    let internal: any = null;
    if (row.recordType === "CHARGE") {
      const attempt: any = attemptByRef.get(row.reference);
      internal = attempt?.payment || null;
      if (internal) seenInternalPayments.add(internal.id);
    } else if (row.recordType === "REFUND") internal = refundByRef.get(row.reference) || null;
    else internal = payoutByRef.get(row.reference) || null;
    let status = "UNMATCHED_PROVIDER_RECORD";
    if (duplicateCount > 1) status = "DUPLICATE_PROVIDER_REFERENCE";
    else if (!internal) status = "UNMATCHED_PROVIDER_RECORD";
    else if (String(internal.currency || "").toUpperCase() !== row.currency) status = "CURRENCY_MISMATCH";
    else if (BigInt(internal.amountMinor || 0n) !== BigInt(row.amountMinor)) status = "AMOUNT_MISMATCH";
    else {
      const providerStateValue = providerState(row.recordType, row.providerStatus);
      const internalStateValue = localState(row.recordType, String(internal.status || ""));
      if (providerStateValue !== internalStateValue) status = "PROVIDER_LOCAL_STATUS_MISMATCH";
      else if (providerStateValue === "SUCCESS") status = "MATCHED_SUCCESS";
      else if (["FAILED", "PENDING", "REVERSED"].includes(providerStateValue)) status = "MATCHED_NON_SUCCESS";
      else status = "UNRECOGNIZED_MATCHED_STATUS_REQUIRES_REVIEW";
    }
    return { recordType: row.recordType, reference: row.reference, providerRecordId: row.providerRecordId, providerStatus: row.providerStatus, amountMinor: BigInt(row.amountMinor), currency: row.currency, internalRecordId: internal?.id || null, status, details: { duplicateCount } };
  });
  for (const payment of internalPayments as any[]) {
    if (seenInternalPayments.has(payment.id)) continue;
    const amountMinor = BigInt(payment.amountMinor || 0n);
    const attempt = payment.attempts?.[0];
    items.push({ recordType: "CHARGE", reference: `INTERNAL-MISSING:${payment.id}`, providerRecordId: payment.providerTransactionId || null, providerStatus: "missing from imported statement", amountMinor, currency: payment.currency, internalRecordId: payment.id, status: "MISSING_PROVIDER_CHARGE", details: { providerReference: attempt?.providerReference || null } });
  }
  const storedItems: any[] = [];
  const storedKeys = new Set<string>();
  for (const item of items) {
    const key = `${item.recordType}:${item.reference}`;
    if (storedKeys.has(key)) continue;
    storedKeys.add(key); storedItems.push(item);
  }
  const unresolved = storedItems.some((item) => !["MATCHED_SUCCESS", "MATCHED_NON_SUCCESS"].includes(item.status));
  try {
    const reconciliation = await prisma.$transaction(async (tx: any) => {
      const row = await tx.paymentReconciliation.create({ data: {
        provider: "paystack", periodStart: start, periodEnd: end, currency,
        internalTotalMinor: internalChargeTotal, providerTotalMinor: providerChargeTotal,
        discrepancyMinor: providerChargeTotal - internalChargeTotal, status: unresolved ? "OPEN" : "MATCHED_PENDING_REVIEW",
        notes: String(body.notes || "Imported provider statement; totals are charge-only; all row matches require administrator review.").slice(0, 2000),
        items: { create: storedItems.map((item) => ({ recordType: item.recordType, reference: item.reference, providerRecordId: item.providerRecordId, providerStatus: item.providerStatus, amountMinor: item.amountMinor, currency: item.currency, internalRecordId: item.internalRecordId, status: item.status, details: item.details })) },
      } });
      await tx.auditLog.create({ data: { userId: actorId, action: "CREATE_PAYSTACK_RECONCILIATION", entity: "PaymentReconciliation", entityId: row.id, metadata: { periodStart: start.toISOString(), periodEnd: end.toISOString(), currency, providerRecordCount: normalized.length, internalChargeTotalMinor: internalChargeTotal.toString(), providerChargeTotalMinor: providerChargeTotal.toString(), discrepancyMinor: (providerChargeTotal - internalChargeTotal).toString(), unresolvedItems: storedItems.filter((item) => !["MATCHED_SUCCESS", "MATCHED_NON_SUCCESS"].includes(item.status)).length } } });
      return row;
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 30_000 });
    return NextResponse.json({ ok: true, item: { id: reconciliation.id, status: reconciliation.status, internalTotalMinor: String(internalChargeTotal), providerTotalMinor: String(providerChargeTotal), discrepancyMinor: String(providerChargeTotal - internalChargeTotal), itemCount: storedItems.length, unresolvedCount: storedItems.filter((item) => !["MATCHED_SUCCESS", "MATCHED_NON_SUCCESS"].includes(item.status)).length } }, { status: 201 });
  } catch (error: any) {
    console.error("[payment-reconciliation] import failed", String(error?.message || "").slice(0, 120));
    return NextResponse.json({ error: "RECONCILIATION_IMPORT_FAILED", message: "Could not persist reconciliation records; verify the imported statement and retry." }, { status: 500 });
  }
}
