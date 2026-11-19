import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPaystackSubaccount, createPaystackTransferRecipient, listPaystackBanks, resolvePaystackAccountNumber } from "@/lib/paystack";
import { getPaymentRuntimeConfig, PaymentConfigurationError } from "@/lib/payments/config";

function maskAccount(account: string) { return `••••${account.slice(-4)}`; }
function normalizeName(name: string) { return name.toUpperCase().replace(/[^A-Z0-9]/g, ""); }

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const role = (session.user as any).role;
  const userId = String((session.user as any).id || "");
  let profileId: string | null = null;
  let sellerType = "";
  if (role === "TAILOR") {
    profileId = (await prisma.tailorProfile.findUnique({ where: { userId }, select: { id: true } }))?.id || null;
    sellerType = "TAILOR";
  } else if (role === "FABRIC_SELLER") {
    profileId = (await prisma.sellerProfile.findUnique({ where: { userId }, select: { id: true } }))?.id || null;
    sellerType = "FABRIC_SELLER";
  } else return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!profileId) return NextResponse.json({ error: "SELLER_PROFILE_NOT_FOUND" }, { status: 404 });
  const paymentProfile = sellerType === "TAILOR"
    ? await prisma.sellerPaymentProfile.findUnique({ where: { tailorProfileId: profileId } })
    : await prisma.sellerPaymentProfile.findUnique({ where: { sellerProfileId: profileId } });
  if (!paymentProfile) return NextResponse.json({ item: null });
  return NextResponse.json({ item: {
    id: paymentProfile.id,
    accountHolderName: paymentProfile.accountHolderName,
    bankName: paymentProfile.bankName,
    bankCode: paymentProfile.bankCode,
    maskedAccountNumber: paymentProfile.maskedAccountNumber,
    currency: paymentProfile.currency,
    verificationStatus: paymentProfile.verificationStatus,
    payoutEligible: paymentProfile.payoutEligible,
    settlementPolicy: paymentProfile.settlementPolicy,
    updatedAt: paymentProfile.updatedAt,
  } });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const role = (session.user as any).role;
  const userId = String((session.user as any).id || "");
  let sellerType: string;
  let tailorProfileId: string | null = null;
  let sellerProfileId: string | null = null;
  let businessName = "";
  let businessStatus = "";
  let email = "";
  if (role === "TAILOR") {
    const profile = await prisma.tailorProfile.findUnique({ where: { userId }, include: { user: { select: { email: true } } } });
    if (!profile) return NextResponse.json({ error: "SELLER_PROFILE_NOT_FOUND" }, { status: 404 });
    sellerType = "TAILOR"; tailorProfileId = profile.id; businessName = profile.businessName; businessStatus = profile.businessStatus; email = profile.user.email || "";
  } else if (role === "FABRIC_SELLER") {
    const profile = await prisma.sellerProfile.findUnique({ where: { userId }, include: { user: { select: { email: true } } } });
    if (!profile) return NextResponse.json({ error: "SELLER_PROFILE_NOT_FOUND" }, { status: 404 });
    sellerType = "FABRIC_SELLER"; sellerProfileId = profile.id; businessName = profile.businessName; businessStatus = profile.businessStatus; email = profile.user.email || "";
  } else return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (businessStatus !== "APPROVED") return NextResponse.json({ error: "SELLER_VERIFICATION_REQUIRED" }, { status: 409 });

  const body: any = await req.json().catch(() => ({}));
  const accountNumber = String(body.accountNumber || "").replace(/\s/g, "");
  const bankCode = String(body.bankCode || "").trim();
  if (!/^\d{6,20}$/.test(accountNumber) || !/^[A-Za-z0-9_-]{2,20}$/.test(bankCode)) return NextResponse.json({ error: "Valid bankCode and accountNumber are required" }, { status: 400 });
  if (body.payoutEligible !== undefined || body.settlementPolicy !== undefined || body.paystackSubaccountCode !== undefined || body.paystackTransferRecipientCode !== undefined) {
    return NextResponse.json({ error: "Seller cannot set payout eligibility, settlement policy, or provider references" }, { status: 400 });
  }

  let config;
  try { config = getPaymentRuntimeConfig(); }
  catch (error) { return NextResponse.json({ error: "PAYMENT_NOT_CONFIGURED", message: error instanceof PaymentConfigurationError ? error.message : "Payment configuration unavailable" }, { status: 503 }); }

  const existing: any = tailorProfileId
    ? await prisma.sellerPaymentProfile.findUnique({ where: { tailorProfileId } })
    : await prisma.sellerPaymentProfile.findUnique({ where: { sellerProfileId: sellerProfileId ?? undefined } });
  if (existing && (existing.bankCode !== bankCode || existing.maskedAccountNumber !== maskAccount(accountNumber))) {
    await prisma.auditLog.create({ data: { userId, action: "BANK_ACCOUNT_CHANGE_REQUIRES_ADMIN_REVIEW", entity: "SellerPaymentProfile", entityId: existing.id, metadata: { sellerType, attemptedBankCode: bankCode, existingMaskedAccountNumber: existing.maskedAccountNumber, attemptedMaskedAccountNumber: maskAccount(accountNumber) } } }).catch(() => {});
    return NextResponse.json({ error: "BANK_ACCOUNT_CHANGE_REQUIRES_ADMIN_REVIEW", message: "Bank details have already been registered. Account replacement requires administrator review." }, { status: 409 });
  }

  try {
    const resolved = await resolvePaystackAccountNumber(accountNumber, bankCode);
    const resolvedName = String(resolved.account_name || "").trim();
    if (!resolvedName || (body.accountHolderName && normalizeName(String(body.accountHolderName)) !== normalizeName(resolvedName))) {
      await prisma.auditLog.create({ data: { userId, action: "BANK_ACCOUNT_NAME_MISMATCH", entity: "SellerPaymentProfile", entityId: existing?.id || null, metadata: { sellerType, bankCode, maskedAccountNumber: maskAccount(accountNumber) } } }).catch(() => {});
      return NextResponse.json({ error: "BANK_ACCOUNT_NAME_MISMATCH", message: "The provider-verified account name does not match the submitted account holder name." }, { status: 422 });
    }
    const banks: any[] = await listPaystackBanks("nigeria").catch(() => []);
    const bankName = banks.find((bank: any) => String(bank.code || bank.bank_code || "") === bankCode)?.name || existing?.bankName || "Verified bank";

    // Save only masked details. Re-verifying the same account must not erase an uncertain provider-create lock or a prior approved destination.
    const verificationStatus = existing && !["NOT_STARTED", "BANK_VERIFIED"].includes(String(existing.verificationStatus)) ? existing.verificationStatus : "BANK_VERIFIED";
    const payoutEligible = verificationStatus === "VERIFIED" ? Boolean(existing?.payoutEligible) : false;
    let paymentProfile: any = await prisma.sellerPaymentProfile.upsert({
      where: tailorProfileId ? { tailorProfileId } : { sellerProfileId: sellerProfileId! },
      create: {
        sellerType, tailorProfileId, sellerProfileId, accountHolderName: resolvedName, bankName, bankCode,
        maskedAccountNumber: maskAccount(accountNumber), currency: "NGN", verificationStatus: "BANK_VERIFIED",
        payoutEligible: false, settlementPolicy: "DISABLED",
      },
      update: { accountHolderName: resolvedName, bankName, bankCode, maskedAccountNumber: maskAccount(accountNumber), verificationStatus, payoutEligible },
    });

    // Provider-side recipient/subaccount creation is not auto-triggered here. It is an admin-authorized
    // provisioning step because provider create calls have no safe idempotency key and a timeout may be uncertain.
    await prisma.auditLog.create({ data: { userId, action: "SELLER_BANK_ACCOUNT_VERIFIED", entity: "SellerPaymentProfile", entityId: paymentProfile.id, metadata: { sellerType, bankCode, bankName, maskedAccountNumber: maskAccount(accountNumber), accountHolderName: resolvedName, providerDomain: config.environment } } });
    return NextResponse.json({ ok: true, item: {
      id: paymentProfile.id, accountHolderName: resolvedName, bankName, bankCode,
      maskedAccountNumber: maskAccount(accountNumber), currency: "NGN", verificationStatus: paymentProfile.verificationStatus,
      payoutEligible: paymentProfile.payoutEligible, settlementPolicy: paymentProfile.settlementPolicy,
      message: paymentProfile.verificationStatus === "VERIFIED" ? "Bank ownership and Paystack destination status are preserved. Administrator approval still controls settlement eligibility." : "Bank ownership was resolved by Paystack. Provider destination provisioning and administrator settlement approval are separate steps.",
    } });
  } catch (error: any) {
    await prisma.auditLog.create({ data: { userId, action: "SELLER_BANK_VERIFICATION_FAILED", entity: "SellerPaymentProfile", entityId: existing?.id || null, metadata: { sellerType, bankCode, maskedAccountNumber: maskAccount(accountNumber), failure: "provider verification/provisioning failed" } } }).catch(() => {});
    return NextResponse.json({ error: "BANK_VERIFICATION_FAILED", message: String(error?.message || "Paystack account verification failed").slice(0, 160) }, { status: 502 });
  }
}
