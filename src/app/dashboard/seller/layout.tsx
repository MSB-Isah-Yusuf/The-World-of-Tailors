import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MainScrollHandler } from "@/components/dashboard/MainScrollHandler";
import { MobileNavWrapper } from "@/components/dashboard/MobileNavWrapper";
import { SELLER_GROUPS } from "@/lib/nav-config";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-ivory dark:bg-midnight flex">
      <SidebarNav role="SELLER" groups={SELLER_GROUPS} />
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <DashboardHeader groups={SELLER_GROUPS} />
        <main id="dashboard-main" className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-6 bg-ivory dark:bg-midnight">
          <div className="mx-auto max-w-7xl pb-16 lg:pb-0">{children}</div>
        </main>
      </div>
      <MobileNavWrapper role="SELLER" groups={SELLER_GROUPS} />
      <MainScrollHandler />
    </div>
  );
}
