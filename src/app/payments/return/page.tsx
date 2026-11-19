import { PaymentReturnClient } from "@/app/payments/return/PaymentReturnClient";

export default async function PaymentReturnPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const params = await searchParams;
  return <PaymentReturnClient reference={String(params.reference || "").slice(0, 64)} />;
}
