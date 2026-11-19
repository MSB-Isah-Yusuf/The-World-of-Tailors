import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaymentRuntimeConfig, PaymentConfigurationError } from "@/lib/payments/config";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const actorId = String((session.user as any).id || "");
  const { id } = await params;
  const body: any = await req.json().catch(() => ({}));
  const profile: any = await prisma.sellerPaymentProfile.findUnique({ where: { id } });
  if (!profile) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const settlementPolicy = body.settlementPolicy === undefined ? profile.settlementPolicy : String(body.settlementPolicy).toUpperCase();
  if (!["DISABLED", "IMMEDIATE_SPLIT", "CONTROLLED_PAYOUT"].includes(settlementPolicy)) return NextResponse.json({ error: "Invalid settlementPolicy" }, { status: 400 });

  const enablingOrProvisioning = settlementPolicy !== "DISABLED" && body.suspendPayouts !== true && (body.settlementPolicy !== undefined || body.payoutEligible === true);
  if (enablingOrProvisioning) {
    let config;
    try { config = getPaymentRuntimeConfig(); }
    catch (error) { return NextResponse.json({ error: "PAYMENT_NOT_CONFIGURED", message: error instanceof PaymentConfigurationError ? error.message : "Payment configuration unavailable" }, { status: 503 }); }
    if (settlementPolicy === "IMMEDIATE_SPLIT" && !config.immediateSplitEnabled) return NextResponse.json({ error: "IMMEDIATE_SPLIT_DISABLED", message: "Enable only after Paystack has approved the merchant/subaccount arrangement." }, { status: 409 });
    if (settlementPolicy === "CONTROLLED_PAYOUT" && !config.controlledPayoutsEnabled) return NextResponse.json({ error: "CONTROLLED_PAYOUTS_DISABLED", message: "Controlled payouts require documented Paystack/business approval and both production configuration gates." }, { status: 409 });
  }
  if (settlementPolicy !== "DISABLED" && !profile.bankCode) return NextResponse.json({ error: "BANK_ACCOUNT_NOT_VERIFIED" }, { status: 409 });

  const requestedEligible = body.payoutEligible === true;
  let payoutEligible = profile.payoutEligible;
  if (body.payoutEligible === false || settlementPolicy === "DISABLED" || body.suspendPayouts === true) payoutEligible = false;
  if (requestedEligible) {
    const providerReady = profile.verificationStatus === "VERIFIED" && (settlementPolicy === "IMMEDIATE_SPLIT" ? !!profile.paystackSubaccountCode && profile.subaccountActive : settlementPolicy === "CONTROLLED_PAYOUT" ? !!profile.paystackTransferRecipientCode : false);
    if (!providerReady) return NextResponse.json({ error: "PROVIDER_DESTINATION_NOT_VERIFIED" }, { status: 409 });
    payoutEligible = true;
  }
  const suspendedAt = body.suspendPayouts === true ? new Date() : body.suspendPayouts === false ? null : profile.suspendedAt;
  if (suspendedAt) payoutEligible = false;

  const updated = await prisma.$transaction(async (tx: any) => {
    const row = await tx.sellerPaymentProfile.update({ where: { id }, data: { settlementPolicy, payoutEligible, suspendedAt } });
    await tx.auditLog.create({ data: { userId: actorId, action: "ADMIN_UPDATE_SELLER_SETTLEMENT_POLICY", entity: "SellerPaymentProfile", entityId: id, metadata: { previousPolicy: profile.settlementPolicy, settlementPolicy, previousEligible: profile.payoutEligible, payoutEligible, suspended: !!suspendedAt, providerCodePresent: Boolean(profile.paystackSubaccountCode || profile.paystackTransferRecipientCode) } } });
    return row;
  });
  return NextResponse.json({ ok: true, item: { id: updated.id, settlementPolicy: updated.settlementPolicy, payoutEligible: updated.payoutEligible, verificationStatus: updated.verificationStatus, suspendedAt: updated.suspendedAt, maskedAccountNumber: updated.maskedAccountNumber } });
}
