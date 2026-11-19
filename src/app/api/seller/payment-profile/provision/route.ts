import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaymentRuntimeConfig, PaymentConfigurationError } from "@/lib/payments/config";
import { createPaystackSubaccount, createPaystackTransferRecipient, resolvePaystackAccountNumber } from "@/lib/paystack";

function normalizeName(value: string) { return value.toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function sameLastFour(account: string, masked: string | null) { return !!masked && masked.endsWith(account.slice(-4)); }

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const userId = String((session.user as any).id || "");
  const role = (session.user as any).role;
  let tailorProfileId: string | null = null;
  let sellerProfileId: string | null = null;
  let businessName = "";
  let email = "";
  let status = "";
  if (role === "TAILOR") {
    const profile = await prisma.tailorProfile.findUnique({ where: { userId }, include: { user: { select: { email: true } } } });
    if (!profile) return NextResponse.json({ error: "SELLER_PROFILE_NOT_FOUND" }, { status: 404 });
    tailorProfileId = profile.id; businessName = profile.businessName; email = profile.user.email || ""; status = profile.businessStatus;
  } else if (role === "FABRIC_SELLER") {
    const profile = await prisma.sellerProfile.findUnique({ where: { userId }, include: { user: { select: { email: true } } } });
    if (!profile) return NextResponse.json({ error: "SELLER_PROFILE_NOT_FOUND" }, { status: 404 });
    sellerProfileId = profile.id; businessName = profile.businessName; email = profile.user.email || ""; status = profile.businessStatus;
  } else return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (status !== "APPROVED") return NextResponse.json({ error: "SELLER_VERIFICATION_REQUIRED" }, { status: 409 });

  const profile: any = tailorProfileId
    ? await prisma.sellerPaymentProfile.findUnique({ where: { tailorProfileId } })
    : await prisma.sellerPaymentProfile.findUnique({ where: { sellerProfileId: sellerProfileId ?? undefined } });
  if (!profile) return NextResponse.json({ error: "BANK_ACCOUNT_NOT_REGISTERED" }, { status: 409 });
  const settlementRoute = String(profile.settlementPolicy || "DISABLED").toUpperCase();
  if (!["IMMEDIATE_SPLIT", "CONTROLLED_PAYOUT"].includes(settlementRoute)) return NextResponse.json({ error: "SETTLEMENT_ROUTE_NOT_APPROVED" }, { status: 409 });
  if (profile.verificationStatus === "PROVISIONING" || profile.verificationStatus === "PROVISIONING_UNKNOWN") return NextResponse.json({ error: "PROVISIONING_REQUIRES_ADMIN_RECONCILIATION", message: "A previous provider creation may have completed. Do not retry until an administrator reconciles the Paystack dashboard." }, { status: 409 });
  if ((settlementRoute === "IMMEDIATE_SPLIT" && profile.paystackSubaccountCode) || (settlementRoute === "CONTROLLED_PAYOUT" && profile.paystackTransferRecipientCode)) return NextResponse.json({ error: "PROVIDER_RECIPIENT_ALREADY_EXISTS" }, { status: 409 });

  let config;
  try { config = getPaymentRuntimeConfig(); }
  catch (error) { return NextResponse.json({ error: "PAYMENT_NOT_CONFIGURED", message: error instanceof PaymentConfigurationError ? error.message : "Payment configuration unavailable" }, { status: 503 }); }
  if (settlementRoute === "IMMEDIATE_SPLIT" && !config.immediateSplitEnabled) return NextResponse.json({ error: "IMMEDIATE_SPLIT_DISABLED" }, { status: 409 });
  if (settlementRoute === "CONTROLLED_PAYOUT" && !config.controlledPayoutsEnabled) return NextResponse.json({ error: "CONTROLLED_PAYOUTS_DISABLED" }, { status: 409 });

  const body: any = await req.json().catch(() => ({}));
  const accountNumber = String(body.accountNumber || "").replace(/\s/g, "");
  const bankCode = String(body.bankCode || "").trim();
  if (!/^\d{6,20}$/.test(accountNumber) || !/^[A-Za-z0-9_-]{2,20}$/.test(bankCode)) return NextResponse.json({ error: "Valid bankCode and accountNumber are required" }, { status: 400 });
  if (bankCode !== profile.bankCode || !sameLastFour(accountNumber, profile.maskedAccountNumber)) return NextResponse.json({ error: "BANK_DETAILS_DO_NOT_MATCH_VERIFIED_PROFILE" }, { status: 409 });

  // Resolve and compare before the non-idempotent provider-create call. A deterministic
  // name mismatch or a failed read-only lookup must not strand the profile as unknown.
  let resolved: any;
  try {
    resolved = await resolvePaystackAccountNumber(accountNumber, bankCode);
  } catch {
    await prisma.auditLog.create({ data: { userId, action: "PAYSTACK_SELLER_ACCOUNT_RESOLUTION_FAILED", entity: "SellerPaymentProfile", entityId: profile.id, metadata: { route: settlementRoute, bankCode, maskedAccountNumber: profile.maskedAccountNumber } } }).catch(() => {});
    return NextResponse.json({ error: "PAYSTACK_ACCOUNT_RESOLUTION_FAILED", message: "The account could not be re-verified. No Paystack destination was created; retry the verification step." }, { status: 502 });
  }
  const resolvedName = normalizeName(String(resolved.account_name || ""));
  const expectedName = normalizeName(String(profile.accountHolderName || ""));
  if (!resolvedName || !expectedName || resolvedName !== expectedName) {
    await prisma.auditLog.create({ data: { userId, action: "PAYSTACK_SELLER_ACCOUNT_NAME_MISMATCH", entity: "SellerPaymentProfile", entityId: profile.id, metadata: { route: settlementRoute, bankCode, maskedAccountNumber: profile.maskedAccountNumber } } }).catch(() => {});
    return NextResponse.json({ error: "ACCOUNT_NAME_MISMATCH", message: "The resolved account name does not match the bank-verified seller profile. No Paystack destination was created." }, { status: 409 });
  }

  // Lock immediately before the non-idempotent provider-create call. If the request outcome
  // is uncertain after this point, retain the lock and reconcile the same provider destination.
  const locked = await prisma.sellerPaymentProfile.updateMany({ where: { id: profile.id, verificationStatus: "BANK_VERIFIED", payoutEligible: false }, data: { verificationStatus: "PROVISIONING" } });
  if (locked.count !== 1) return NextResponse.json({ error: "PROFILE_NOT_READY_FOR_PROVISIONING" }, { status: 409 });
  let providerCreateStarted = false;
  try {
    let subaccountCode: string | null = null;
    let recipientCode: string | null = null;
    let providerVerified = false;
    let active = false;

    if (settlementRoute === "IMMEDIATE_SPLIT") {
      providerCreateStarted = true;
      const subaccount = await createPaystackSubaccount({ businessName, bankCode, accountNumber, percentageCharge: 0, email: email || undefined });
      subaccountCode = String(subaccount.subaccount_code || "");
      active = Boolean(subaccount.active);
      providerVerified = Boolean(subaccount.is_verified && active && String(subaccount.currency || "NGN").toUpperCase() === "NGN");
      if (!subaccountCode) throw new Error("SUBACCOUNT_CODE_MISSING");
    } else {
      providerCreateStarted = true;
      const recipient = await createPaystackTransferRecipient({ name: String(resolved.account_name), accountNumber, bankCode, email: email || undefined, currency: "NGN" });
      recipientCode = String(recipient.recipient_code || "");
      const returnedAccount = String(recipient.details?.account_number || "");
      const returnedBank = String(recipient.details?.bank_code || "");
      if (!recipientCode || (returnedAccount && returnedAccount !== accountNumber) || (returnedBank && returnedBank !== bankCode)) throw new Error("RECIPIENT_DETAILS_MISMATCH");
      providerVerified = true; active = true;
    }

    const verificationStatus = providerVerified ? "VERIFIED" : "PENDING_PROVIDER_VERIFICATION";
    const updated = await prisma.sellerPaymentProfile.update({ where: { id: profile.id }, data: {
      paystackSubaccountCode: subaccountCode || profile.paystackSubaccountCode,
      paystackTransferRecipientCode: recipientCode || profile.paystackTransferRecipientCode,
      subaccountActive: settlementRoute === "IMMEDIATE_SPLIT" ? active : false,
      verificationStatus,
      verifiedAt: providerVerified ? new Date() : null,
      payoutEligible: false,
    } });
    await prisma.auditLog.create({ data: { userId, action: providerVerified ? "PAYSTACK_SELLER_DESTINATION_PROVISIONED" : "PAYSTACK_SELLER_DESTINATION_PENDING", entity: "SellerPaymentProfile", entityId: profile.id, metadata: { sellerType: profile.sellerType, route: settlementRoute, subaccountCode, recipientCode, providerVerified, active } } }).catch(() => {});
    return NextResponse.json({ ok: true, item: { verificationStatus: updated.verificationStatus, payoutEligible: updated.payoutEligible, settlementPolicy: updated.settlementPolicy, subaccountActive: updated.subaccountActive, maskedAccountNumber: updated.maskedAccountNumber, bankName: updated.bankName }, message: providerVerified ? "Provider destination is verified. Settlement eligibility still follows administrator policy." : "Provider destination was created but is not verified yet; payouts remain disabled." });
  } catch (error: any) {
    if (!providerCreateStarted) {
      await prisma.sellerPaymentProfile.updateMany({ where: { id: profile.id, verificationStatus: "PROVISIONING" }, data: { verificationStatus: "BANK_VERIFIED", payoutEligible: false } }).catch(() => {});
      await prisma.auditLog.create({ data: { userId, action: "PAYSTACK_SELLER_DESTINATION_PREFLIGHT_FAILED", entity: "SellerPaymentProfile", entityId: profile.id, metadata: { route: settlementRoute, bankCode, maskedAccountNumber: profile.maskedAccountNumber } } }).catch(() => {});
      return NextResponse.json({ error: "PAYSTACK_DESTINATION_PREFLIGHT_FAILED", message: "No provider create request was sent. Retry after resolving the local setup issue." }, { status: 502 });
    }
    await prisma.sellerPaymentProfile.updateMany({ where: { id: profile.id, verificationStatus: "PROVISIONING" }, data: { verificationStatus: "PROVISIONING_UNKNOWN", payoutEligible: false, subaccountActive: false } }).catch(() => {});
    await prisma.auditLog.create({ data: { userId, action: "PAYSTACK_SELLER_DESTINATION_PROVISIONING_UNKNOWN", entity: "SellerPaymentProfile", entityId: profile.id, metadata: { route: settlementRoute, bankCode, maskedAccountNumber: profile.maskedAccountNumber, failure: "provider result must be reconciled before retry" } } }).catch(() => {});
    return NextResponse.json({ error: "PROVISIONING_REQUIRES_ADMIN_RECONCILIATION", message: "The provider create request may have succeeded. A duplicate Paystack destination will not be created automatically; reconcile this same destination before retrying." }, { status: 502 });
  }
}
