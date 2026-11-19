import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { paymentReadinessSummary } from "@/lib/payments/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminFinancePage() {
  await requireRole(["ADMIN"]);
  const [pendingReview, retryableWebhooks, awaitingPayouts, openRefunds, openReconciliations, activeRules, sellerProfiles] = await Promise.all([
    prisma.payment.count({ where: { status: "REVIEW_REQUIRED" as any } }).catch(() => 0),
    prisma.paymentWebhookEvent.count({ where: { processingStatus: "RETRYABLE" } }).catch(() => 0),
    prisma.payout.count({ where: { status: { in: ["REQUESTED", "AWAITING_SECOND_APPROVAL", "INITIATING", "PROCESSING", "TRANSFER_UNKNOWN"] } } }).catch(() => 0),
    prisma.refund.count({ where: { status: { in: ["REQUESTED", "AWAITING_SECOND_APPROVAL", "INITIATING", "PROCESSING", "REFUND_UNKNOWN", "REVIEW_REQUIRED"] } } }).catch(() => 0),
    prisma.paymentReconciliation.count({ where: { status: "OPEN" } }).catch(() => 0),
    prisma.commissionRule.count({ where: { active: true } }).catch(() => 0),
    prisma.sellerPaymentProfile.count().catch(() => 0),
  ]);
  const readiness = paymentReadinessSummary();
  return <div className="space-y-6">
    <div><h1 className="font-display text-2xl">Marketplace finance</h1><p className="text-sm text-muted-foreground">Operational controls and reconciliation indicators. This interface does not represent escrow or legal compliance.</p></div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{[["Payments requiring review", pendingReview], ["Retryable webhooks", retryableWebhooks], ["Open/uncertain payouts", awaitingPayouts], ["Open refunds", openRefunds], ["Open reconciliations", openReconciliations], ["Active commission rules", activeRules], ["Seller payment profiles", sellerProfiles]].map(([label, value]: any) => <Card key={label}><CardHeader><CardTitle className="text-xs">{label}</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{value}</CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle className="text-sm">Payment configuration readiness</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>{readiness.configured ? `Configured for ${readiness.environment} ${readiness.currency}.` : `Not configured: ${readiness.message || "missing required settings"}`}</p><p className="text-xs text-muted-foreground">Immediate split: {readiness.immediateSplitEnabled ? "enabled by configuration (requires provider/business approval evidence)" : "disabled"} • Controlled payouts: {readiness.controlledPayoutsEnabled ? "enabled by configuration (requires provider/business approval evidence)" : "disabled"}</p><p className="text-xs text-muted-foreground">Commission rates are administrator-provided and independent by category; no rate is preselected. Paystack transaction, transfer and refund status must be reconciled with provider records.</p></CardContent></Card>
    <div className="grid sm:grid-cols-2 gap-3">{[
      ["Commission rules", "/admin/finance/commission-rules", "Create or close category/seller-scoped rates; snapshots are immutable."],
      ["Seller destinations", "/admin/finance/seller-profiles", "Review masked bank details, provider recipients, route and eligibility."],
      ["Payout approval queue", "/admin/finance/payouts", "Two different administrators approve each controlled payout; uncertain status is verified, not resent."],
      ["Refund requests", "/admin/finance/refunds", "Review customer requests, approve with two administrators, and verify provider state."],
      ["Provider reconciliation", "/admin/finance/reconciliation", "Compare normalized Paystack charge, refund and transfer statement rows."],
      ["Payments & transactions", "/admin/payments", "Review verified payments and legacy records."],
      ["Audit log", "/admin/audit", "Inspect logged financial and permission changes."],
    ].map(([title, href, description]) => <Link key={href} href={href} className="rounded-xl border bg-white p-4 hover:bg-ivory dark:bg-white/[0.04] dark:border-white/10"><div className="font-semibold">{title}</div><p className="mt-1 text-xs text-muted-foreground">{description}</p></Link>)}</div>
  </div>;
}
