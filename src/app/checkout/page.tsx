import { SiteHeader } from "@/components/site-header";
import CheckoutClient from "./CheckoutClient";

export default async function CheckoutPage() {
  return (
    <div className="min-h-screen bg-[#FFFBF0]"><SiteHeader />
      <CheckoutClient />
    </div>
  );
}
