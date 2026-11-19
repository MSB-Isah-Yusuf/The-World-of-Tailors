-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'ABANDONED';
ALTER TYPE "PaymentStatus" ADD VALUE 'REVERSED';
ALTER TYPE "PaymentStatus" ADD VALUE 'DEPOSIT_PENDING';
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIALLY_PAID';
ALTER TYPE "PaymentStatus" ADD VALUE 'FULLY_PAID';
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUND_PENDING';
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIALLY_REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE 'REVIEW_REQUIRED';

-- AlterTable
ALTER TABLE "FabricProduct" ADD COLUMN     "priceMinor" BIGINT;

-- AlterTable
ALTER TABLE "TailoringBooking" ADD COLUMN     "agreedAmountMinor" BIGINT,
ADD COLUMN     "depositAmountMinor" BIGINT,
ADD COLUMN     "fulfillmentConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "fulfillmentConfirmedByUserId" TEXT,
ADD COLUMN     "quoteAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "quoteDetails" JSONB,
ADD COLUMN     "quoteExpiresAt" TIMESTAMP(3),
ADD COLUMN     "quoteStatus" TEXT NOT NULL DEFAULT 'NOT_QUOTED';

-- AlterTable
ALTER TABLE "FabricOrder" ADD COLUMN     "deliveryFeeMinor" BIGINT,
ADD COLUMN     "fulfillmentConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "fulfillmentConfirmedByUserId" TEXT,
ADD COLUMN     "orderGroupId" TEXT,
ADD COLUMN     "subtotalMinor" BIGINT,
ADD COLUMN     "totalMinor" BIGINT;

-- AlterTable
ALTER TABLE "FabricOrderItem" ADD COLUMN     "lineTotalMinor" BIGINT,
ADD COLUMN     "priceSnapshotMinor" BIGINT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "amountMinor" BIGINT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "obligationId" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "providerFeeMinor" BIGINT,
ADD COLUMN     "providerTransactionId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PaymentWebhookEvent" ADD COLUMN     "errorSummary" TEXT,
ADD COLUMN     "eventType" TEXT,
ADD COLUMN     "payloadHash" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "processingStatus" TEXT NOT NULL DEFAULT 'RECEIVED',
ADD COLUMN     "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "transactionReference" TEXT;

-- Canonicalize only case/outer-whitespace variants of NGN so existing API and ledger
-- currency checks see the same value. Other currencies and malformed strings are untouched.
UPDATE "FabricProduct" SET "currency" = 'NGN' WHERE upper(trim("currency")) = 'NGN' AND "currency" <> 'NGN';
UPDATE "TailoringBooking" SET "currency" = 'NGN' WHERE upper(trim("currency")) = 'NGN' AND "currency" <> 'NGN';
UPDATE "FabricOrder" SET "currency" = 'NGN' WHERE upper(trim("currency")) = 'NGN' AND "currency" <> 'NGN';
UPDATE "Payment" SET "currency" = 'NGN' WHERE upper(trim("currency")) = 'NGN' AND "currency" <> 'NGN';

-- Safe legacy-value backfills. NGN is the only enabled payment currency.
-- Values outside the supported safe integer range or in another currency remain NULL for review.
-- These copies are historical amount snapshots only; they do not establish provider verification,
-- a Paystack transaction ID, a payment obligation, a commission, or a seller settlement liability.
UPDATE "FabricProduct"
SET "priceMinor" = round("price"::numeric * 100)::bigint
WHERE "priceMinor" IS NULL
  AND upper(trim("currency")) = 'NGN'
  AND "price" >= 0
  AND "price" <= 90071992547409;

UPDATE "TailoringBooking"
SET "agreedAmountMinor" = round("agreedPrice"::numeric * 100)::bigint
WHERE "agreedAmountMinor" IS NULL
  AND "agreedPrice" IS NOT NULL
  AND upper(trim("currency")) = 'NGN'
  AND "agreedPrice" >= 0
  AND "agreedPrice" <= 90071992547409;

UPDATE "FabricOrder"
SET "subtotalMinor" = round("subtotal"::numeric * 100)::bigint
WHERE "subtotalMinor" IS NULL
  AND upper(trim("currency")) = 'NGN'
  AND "subtotal" >= 0
  AND "subtotal" <= 90071992547409;

UPDATE "FabricOrder"
SET "deliveryFeeMinor" = round("deliveryFee"::numeric * 100)::bigint
WHERE "deliveryFeeMinor" IS NULL
  AND upper(trim("currency")) = 'NGN'
  AND "deliveryFee" >= 0
  AND "deliveryFee" <= 90071992547409;

UPDATE "FabricOrder"
SET "totalMinor" = round("total"::numeric * 100)::bigint
WHERE "totalMinor" IS NULL
  AND upper(trim("currency")) = 'NGN'
  AND "total" >= 0
  AND "total" <= 90071992547409;

UPDATE "FabricOrderItem"
SET "priceSnapshotMinor" = round("priceSnapshot"::numeric * 100)::bigint
WHERE "priceSnapshotMinor" IS NULL
  AND "priceSnapshot" >= 0
  AND "priceSnapshot" <= 90071992547409
  AND EXISTS (
    SELECT 1 FROM "FabricOrder" AS o
    JOIN "FabricProduct" AS p ON p."id" = "FabricOrderItem"."productId"
    WHERE o."id" = "FabricOrderItem"."orderId"
      AND upper(trim(o."currency")) = 'NGN'
      AND upper(trim(p."currency")) = 'NGN'
  );

UPDATE "FabricOrderItem"
SET "lineTotalMinor" = round("lineTotal"::numeric * 100)::bigint
WHERE "lineTotalMinor" IS NULL
  AND "lineTotal" >= 0
  AND "lineTotal" <= 90071992547409
  AND EXISTS (
    SELECT 1 FROM "FabricOrder" AS o
    JOIN "FabricProduct" AS p ON p."id" = "FabricOrderItem"."productId"
    WHERE o."id" = "FabricOrderItem"."orderId"
      AND upper(trim(o."currency")) = 'NGN'
      AND upper(trim(p."currency")) = 'NGN'
  );

UPDATE "Payment"
SET "amountMinor" = round("amount"::numeric * 100)::bigint
WHERE "amountMinor" IS NULL
  AND upper(trim("currency")) = 'NGN'
  AND "amount" >= 0
  AND "amount" <= 90071992547409;

-- @updatedAt has no database default. Preserve a deterministic timestamp for legacy rows.
UPDATE "Payment" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "Payment" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Preserve old webhook processing markers without treating them as verified modern events.
UPDATE "PaymentWebhookEvent"
SET "processingStatus" = CASE WHEN "processed" THEN 'LEGACY_PROCESSED' ELSE 'LEGACY_RECEIVED' END
WHERE "processingStatus" = 'RECEIVED' AND "signatureVerified" = false;

-- CreateTable
CREATE TABLE "FabricOrderGroup" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "subtotalMinor" BIGINT NOT NULL,
    "deliveryTotalMinor" BIGINT NOT NULL,
    "totalMinor" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "deliveryType" "DeliveryType" NOT NULL DEFAULT 'TO_CUSTOMER',
    "deliveryAddress" JSONB,
    "tailorDestinationId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FabricOrderGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentObligation" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "orderGroupId" TEXT,
    "fabricOrderId" TEXT,
    "type" TEXT NOT NULL,
    "totalMinor" BIGINT NOT NULL,
    "paidMinor" BIGINT NOT NULL DEFAULT 0,
    "outstandingMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "dueAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "commissionRuleId" TEXT,
    "commissionBaseSnapshot" TEXT,
    "commissionBaseMinor" BIGINT,
    "commissionRateBps" INTEGER NOT NULL DEFAULT 0,
    "commissionFixedFeeMinor" BIGINT NOT NULL DEFAULT 0,
    "commissionMinimumMinorSnapshot" BIGINT,
    "commissionMaximumMinorSnapshot" BIGINT,
    "commissionTotalMinor" BIGINT NOT NULL DEFAULT 0,
    "commissionPaidMinor" BIGINT NOT NULL DEFAULT 0,
    "feePolicySnapshot" TEXT NOT NULL DEFAULT 'PLATFORM',
    "sharedFeePlatformBpsSnapshot" INTEGER,
    "settlementPolicySnapshot" TEXT NOT NULL DEFAULT 'DISABLED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "providerReference" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INITIALIZING',
    "authorizationUrl" TEXT,
    "accessCode" TEXT,
    "providerResponseSummary" JSONB,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "commissionBase" TEXT,
    "rateBps" INTEGER NOT NULL,
    "fixedFeeMinor" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "minimumCommissionMinor" BIGINT,
    "maximumCommissionMinor" BIGINT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tailorProfileId" TEXT,
    "sellerProfileId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "ruleId" TEXT,
    "category" TEXT NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "grossAmountMinor" BIGINT NOT NULL,
    "commissionAmountMinor" BIGINT NOT NULL,
    "sellerAmountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "feePolicy" TEXT NOT NULL DEFAULT 'PLATFORM',
    "tailorProfileId" TEXT,
    "sellerProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerPaymentProfile" (
    "id" TEXT NOT NULL,
    "tailorProfileId" TEXT,
    "sellerProfileId" TEXT,
    "sellerType" TEXT NOT NULL,
    "accountHolderName" TEXT,
    "bankName" TEXT,
    "bankCode" TEXT,
    "maskedAccountNumber" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "paystackSubaccountCode" TEXT,
    "paystackTransferRecipientCode" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "payoutEligible" BOOLEAN NOT NULL DEFAULT false,
    "settlementPolicy" TEXT NOT NULL DEFAULT 'DISABLED',
    "subaccountActive" BOOLEAN NOT NULL DEFAULT false,
    "suspendedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerPaymentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementPolicy" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sellerType" TEXT,
    "tailorProfileId" TEXT,
    "sellerProfileId" TEXT,
    "route" TEXT NOT NULL,
    "approvalMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "approvedById" TEXT,
    "approvalEvidence" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerBalanceSummary" (
    "id" TEXT NOT NULL,
    "sellerPaymentProfileId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "pendingMinor" BIGINT NOT NULL DEFAULT 0,
    "awaitingFulfilmentMinor" BIGINT NOT NULL DEFAULT 0,
    "heldMinor" BIGINT NOT NULL DEFAULT 0,
    "payableMinor" BIGINT NOT NULL DEFAULT 0,
    "processingMinor" BIGINT NOT NULL DEFAULT 0,
    "paidMinor" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerBalanceSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "sellerPaymentProfileId" TEXT NOT NULL,
    "tailorProfileId" TEXT,
    "sellerProfileId" TEXT,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "reference" TEXT NOT NULL,
    "clientRequestId" TEXT,
    "providerTransferId" TEXT,
    "recipientCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requestedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "requiresSecondApproval" BOOLEAN NOT NULL DEFAULT false,
    "secondApprovedByUserId" TEXT,
    "secondApprovedAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "initiatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "reversalReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialJournal" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialLedgerEntry" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "paymentId" TEXT,
    "payoutId" TEXT,
    "refundId" TEXT,
    "sellerPaymentProfileId" TEXT,
    "accountCode" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "debitMinor" BIGINT NOT NULL DEFAULT 0,
    "creditMinor" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "providerRefundReference" TEXT,
    "clientRequestId" TEXT,
    "sellerPaymentProfileId" TEXT,
    "amountMinor" BIGINT NOT NULL,
    "commissionReversedMinor" BIGINT,
    "sellerReversedMinor" BIGINT,
    "sellerPendingReversedMinor" BIGINT,
    "sellerPayableReversedMinor" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requiresSecondApproval" BOOLEAN NOT NULL DEFAULT true,
    "secondApprovedByUserId" TEXT,
    "secondApprovedAt" TIMESTAMP(3),
    "initiatedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "providerResponseSummary" JSONB,
    "initiatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentDispute" (
    "id" TEXT NOT NULL,
    "clientRequestId" TEXT,
    "paymentId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB,
    "sellerPaymentProfileId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedAdminId" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReconciliationItem" (
    "id" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL DEFAULT 'CHARGE',
    "reference" TEXT NOT NULL,
    "providerRecordId" TEXT,
    "providerStatus" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "internalRecordId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReconciliationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReconciliation" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'paystack',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "internalTotalMinor" BIGINT NOT NULL,
    "providerTotalMinor" BIGINT NOT NULL,
    "discrepancyMinor" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FabricOrderGroup_reference_key" ON "FabricOrderGroup"("reference");

-- CreateIndex
CREATE INDEX "FabricOrderGroup_customerId_createdAt_idx" ON "FabricOrderGroup"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "FabricOrderGroup_status_createdAt_idx" ON "FabricOrderGroup"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentObligation_customerId_status_idx" ON "PaymentObligation"("customerId", "status");

-- CreateIndex
CREATE INDEX "PaymentObligation_bookingId_status_idx" ON "PaymentObligation"("bookingId", "status");

-- CreateIndex
CREATE INDEX "PaymentObligation_fabricOrderId_status_idx" ON "PaymentObligation"("fabricOrderId", "status");

-- CreateIndex
CREATE INDEX "PaymentObligation_orderGroupId_status_idx" ON "PaymentObligation"("orderGroupId", "status");

-- CreateIndex
CREATE INDEX "PaymentObligation_status_dueAt_idx" ON "PaymentObligation"("status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_providerReference_key" ON "PaymentAttempt"("providerReference");

-- CreateIndex
CREATE INDEX "PaymentAttempt_status_initiatedAt_idx" ON "PaymentAttempt"("status", "initiatedAt");

-- Serialize attempts per payment even when two initialize requests race.
CREATE UNIQUE INDEX "PaymentAttempt_one_active_per_payment_idx"
ON "PaymentAttempt"("paymentId")
WHERE "status" IN ('INITIALIZING', 'INITIALIZATION_UNKNOWN', 'AWAITING_CUSTOMER', 'PENDING', 'PROCESSING', 'ONGOING');

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_paymentId_attemptNumber_key" ON "PaymentAttempt"("paymentId", "attemptNumber");

-- CreateIndex
CREATE INDEX "CommissionRule_category_active_effectiveFrom_effectiveTo_idx" ON "CommissionRule"("category", "active", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "CommissionRule_tailorProfileId_category_active_idx" ON "CommissionRule"("tailorProfileId", "category", "active");

-- CreateIndex
CREATE INDEX "CommissionRule_sellerProfileId_category_active_idx" ON "CommissionRule"("sellerProfileId", "category", "active");

-- CreateIndex
CREATE INDEX "CommissionAllocation_tailorProfileId_createdAt_idx" ON "CommissionAllocation"("tailorProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "CommissionAllocation_sellerProfileId_createdAt_idx" ON "CommissionAllocation"("sellerProfileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionAllocation_paymentId_category_key" ON "CommissionAllocation"("paymentId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "SellerPaymentProfile_tailorProfileId_key" ON "SellerPaymentProfile"("tailorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerPaymentProfile_sellerProfileId_key" ON "SellerPaymentProfile"("sellerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerPaymentProfile_paystackSubaccountCode_key" ON "SellerPaymentProfile"("paystackSubaccountCode");

-- CreateIndex
CREATE UNIQUE INDEX "SellerPaymentProfile_paystackTransferRecipientCode_key" ON "SellerPaymentProfile"("paystackTransferRecipientCode");

-- CreateIndex
CREATE INDEX "SellerPaymentProfile_sellerType_verificationStatus_payoutEl_idx" ON "SellerPaymentProfile"("sellerType", "verificationStatus", "payoutEligible");

-- CreateIndex
CREATE INDEX "SettlementPolicy_category_active_effectiveFrom_effectiveTo_idx" ON "SettlementPolicy"("category", "active", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "SettlementPolicy_tailorProfileId_active_idx" ON "SettlementPolicy"("tailorProfileId", "active");

-- CreateIndex
CREATE INDEX "SettlementPolicy_sellerProfileId_active_idx" ON "SettlementPolicy"("sellerProfileId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "SellerBalanceSummary_sellerPaymentProfileId_key" ON "SellerBalanceSummary"("sellerPaymentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_reference_key" ON "Payout"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_clientRequestId_key" ON "Payout"("clientRequestId");

-- CreateIndex
CREATE INDEX "Payout_sellerPaymentProfileId_status_requestedAt_idx" ON "Payout"("sellerPaymentProfileId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "Payout_status_requestedAt_idx" ON "Payout"("status", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialJournal_idempotencyKey_key" ON "FinancialJournal"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FinancialJournal_sourceType_sourceId_idx" ON "FinancialJournal"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "FinancialJournal_createdAt_idx" ON "FinancialJournal"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialLedgerEntry_idempotencyKey_key" ON "FinancialLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FinancialLedgerEntry_accountCode_currency_createdAt_idx" ON "FinancialLedgerEntry"("accountCode", "currency", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialLedgerEntry_paymentId_idx" ON "FinancialLedgerEntry"("paymentId");

-- CreateIndex
CREATE INDEX "FinancialLedgerEntry_payoutId_idx" ON "FinancialLedgerEntry"("payoutId");

-- CreateIndex
CREATE INDEX "FinancialLedgerEntry_refundId_idx" ON "FinancialLedgerEntry"("refundId");

-- CreateIndex
CREATE INDEX "FinancialLedgerEntry_sellerPaymentProfileId_accountCode_cre_idx" ON "FinancialLedgerEntry"("sellerPaymentProfileId", "accountCode", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_reference_key" ON "Refund"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_providerRefundReference_key" ON "Refund"("providerRefundReference");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_clientRequestId_key" ON "Refund"("clientRequestId");

-- CreateIndex
CREATE INDEX "Refund_paymentId_status_idx" ON "Refund"("paymentId", "status");

-- CreateIndex
CREATE INDEX "Refund_status_createdAt_idx" ON "Refund"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentDispute_clientRequestId_key" ON "PaymentDispute"("clientRequestId");

-- CreateIndex
CREATE INDEX "PaymentDispute_customerId_status_idx" ON "PaymentDispute"("customerId", "status");

-- CreateIndex
CREATE INDEX "PaymentDispute_assignedAdminId_status_idx" ON "PaymentDispute"("assignedAdminId", "status");

-- CreateIndex
CREATE INDEX "PaymentDispute_paymentId_status_idx" ON "PaymentDispute"("paymentId", "status");

-- CreateIndex
CREATE INDEX "PaymentReconciliationItem_recordType_status_createdAt_idx" ON "PaymentReconciliationItem"("recordType", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReconciliationItem_reconciliationId_recordType_refer_key" ON "PaymentReconciliationItem"("reconciliationId", "recordType", "reference");

-- CreateIndex
CREATE INDEX "PaymentReconciliation_provider_periodStart_periodEnd_idx" ON "PaymentReconciliation"("provider", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "PaymentReconciliation_status_createdAt_idx" ON "PaymentReconciliation"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_obligationId_idx" ON "Payment"("obligationId");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_fabricOrderId_idx" ON "Payment"("fabricOrderId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_processingStatus_createdAt_idx" ON "PaymentWebhookEvent"("processingStatus", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_transactionReference_idx" ON "PaymentWebhookEvent"("transactionReference");

-- AddForeignKey
ALTER TABLE "FabricOrder" ADD CONSTRAINT "FabricOrder_orderGroupId_fkey" FOREIGN KEY ("orderGroupId") REFERENCES "FabricOrderGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "PaymentObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricOrderGroup" ADD CONSTRAINT "FabricOrderGroup_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentObligation" ADD CONSTRAINT "PaymentObligation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentObligation" ADD CONSTRAINT "PaymentObligation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "TailoringBooking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentObligation" ADD CONSTRAINT "PaymentObligation_orderGroupId_fkey" FOREIGN KEY ("orderGroupId") REFERENCES "FabricOrderGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentObligation" ADD CONSTRAINT "PaymentObligation_fabricOrderId_fkey" FOREIGN KEY ("fabricOrderId") REFERENCES "FabricOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentObligation" ADD CONSTRAINT "PaymentObligation_commissionRuleId_fkey" FOREIGN KEY ("commissionRuleId") REFERENCES "CommissionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_tailorProfileId_fkey" FOREIGN KEY ("tailorProfileId") REFERENCES "TailorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionAllocation" ADD CONSTRAINT "CommissionAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionAllocation" ADD CONSTRAINT "CommissionAllocation_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "CommissionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionAllocation" ADD CONSTRAINT "CommissionAllocation_tailorProfileId_fkey" FOREIGN KEY ("tailorProfileId") REFERENCES "TailorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionAllocation" ADD CONSTRAINT "CommissionAllocation_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerPaymentProfile" ADD CONSTRAINT "SellerPaymentProfile_tailorProfileId_fkey" FOREIGN KEY ("tailorProfileId") REFERENCES "TailorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerPaymentProfile" ADD CONSTRAINT "SellerPaymentProfile_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerBalanceSummary" ADD CONSTRAINT "SellerBalanceSummary_sellerPaymentProfileId_fkey" FOREIGN KEY ("sellerPaymentProfileId") REFERENCES "SellerPaymentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_sellerPaymentProfileId_fkey" FOREIGN KEY ("sellerPaymentProfileId") REFERENCES "SellerPaymentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_tailorProfileId_fkey" FOREIGN KEY ("tailorProfileId") REFERENCES "TailorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_secondApprovedByUserId_fkey" FOREIGN KEY ("secondApprovedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialLedgerEntry" ADD CONSTRAINT "FinancialLedgerEntry_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "FinancialJournal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialLedgerEntry" ADD CONSTRAINT "FinancialLedgerEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialLedgerEntry" ADD CONSTRAINT "FinancialLedgerEntry_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialLedgerEntry" ADD CONSTRAINT "FinancialLedgerEntry_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialLedgerEntry" ADD CONSTRAINT "FinancialLedgerEntry_sellerPaymentProfileId_fkey" FOREIGN KEY ("sellerPaymentProfileId") REFERENCES "SellerPaymentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_sellerPaymentProfileId_fkey" FOREIGN KEY ("sellerPaymentProfileId") REFERENCES "SellerPaymentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_secondApprovedByUserId_fkey" FOREIGN KEY ("secondApprovedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_initiatedByUserId_fkey" FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDispute" ADD CONSTRAINT "PaymentDispute_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDispute" ADD CONSTRAINT "PaymentDispute_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDispute" ADD CONSTRAINT "PaymentDispute_sellerPaymentProfileId_fkey" FOREIGN KEY ("sellerPaymentProfileId") REFERENCES "SellerPaymentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDispute" ADD CONSTRAINT "PaymentDispute_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReconciliationItem" ADD CONSTRAINT "PaymentReconciliationItem_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "PaymentReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Enforce append-only journal/entry storage at the database boundary.
ALTER TABLE "FinancialJournal"
ADD CONSTRAINT "FinancialJournal_currency_format_check"
CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "FinancialLedgerEntry"
ADD CONSTRAINT "FinancialLedgerEntry_currency_format_check"
CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "FinancialLedgerEntry"
ADD CONSTRAINT "FinancialLedgerEntry_single_sided_amount_check"
CHECK (
  "debitMinor" >= 0
  AND "creditMinor" >= 0
  AND (("debitMinor" = 0 AND "creditMinor" > 0) OR ("creditMinor" = 0 AND "debitMinor" > 0))
);

CREATE FUNCTION "twt_reject_financial_ledger_mutation"() RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'Financial journals and ledger entries are append-only';
  RETURN NULL;
END;
$function$;

CREATE TRIGGER "FinancialJournal_append_only"
BEFORE UPDATE OR DELETE ON "FinancialJournal"
FOR EACH ROW EXECUTE FUNCTION "twt_reject_financial_ledger_mutation"();

CREATE TRIGGER "FinancialJournal_no_truncate"
BEFORE TRUNCATE ON "FinancialJournal"
FOR EACH STATEMENT EXECUTE FUNCTION "twt_reject_financial_ledger_mutation"();

CREATE TRIGGER "FinancialLedgerEntry_append_only"
BEFORE UPDATE OR DELETE ON "FinancialLedgerEntry"
FOR EACH ROW EXECUTE FUNCTION "twt_reject_financial_ledger_mutation"();

CREATE TRIGGER "FinancialLedgerEntry_no_truncate"
BEFORE TRUNCATE ON "FinancialLedgerEntry"
FOR EACH STATEMENT EXECUTE FUNCTION "twt_reject_financial_ledger_mutation"();

-- Deferred checks permit a journal and all of its entries to be inserted in one transaction,
-- then require at least two lines and equal aggregate debits/credits at commit time.
CREATE FUNCTION "twt_assert_financial_journal_balanced"() RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  target_journal_id TEXT;
  journal_currency TEXT;
  entry_count BIGINT;
  currency_mismatch_count BIGINT;
  debit_total NUMERIC;
  credit_total NUMERIC;
BEGIN
  IF TG_TABLE_NAME = 'FinancialJournal' THEN
    IF TG_OP = 'DELETE' THEN
      target_journal_id := OLD."id";
    ELSE
      target_journal_id := NEW."id";
    END IF;
  ELSE
    IF TG_OP = 'DELETE' THEN
      target_journal_id := OLD."journalId";
    ELSE
      target_journal_id := NEW."journalId";
    END IF;
  END IF;

  SELECT "currency" INTO journal_currency
  FROM "FinancialJournal"
  WHERE "id" = target_journal_id;
  IF journal_currency IS NULL THEN
    RAISE EXCEPTION 'Financial journal % does not exist', target_journal_id;
  END IF;

  SELECT count(*), count(*) FILTER (WHERE "currency" <> journal_currency),
         coalesce(sum("debitMinor"), 0), coalesce(sum("creditMinor"), 0)
  INTO entry_count, currency_mismatch_count, debit_total, credit_total
  FROM "FinancialLedgerEntry"
  WHERE "journalId" = target_journal_id;

  IF entry_count < 2 OR currency_mismatch_count <> 0 OR debit_total <> credit_total THEN
    RAISE EXCEPTION 'Financial journal % is invalid (entries %, currency mismatches %, debits %, credits %)',
      target_journal_id, entry_count, currency_mismatch_count, debit_total, credit_total;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE CONSTRAINT TRIGGER "FinancialJournal_balanced_at_commit"
AFTER INSERT OR UPDATE OR DELETE ON "FinancialJournal"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "twt_assert_financial_journal_balanced"();

CREATE CONSTRAINT TRIGGER "FinancialLedgerEntry_balanced_at_commit"
AFTER INSERT OR UPDATE OR DELETE ON "FinancialLedgerEntry"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "twt_assert_financial_journal_balanced"();
