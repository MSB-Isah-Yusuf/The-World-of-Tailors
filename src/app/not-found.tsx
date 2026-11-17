import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FFFBF0] dark:bg-[#191919]">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Card className="dark:bg-[#292929] dark:border-[#3A3936]">
          <CardHeader>
            <CardTitle className="font-display text-3xl dark:text-[#F5F3EF]">404 — Page not found</CardTitle>
            <p className="text-sm text-muted-foreground dark:text-[#B8B5AE]">The atelier you were looking for has moved or the pattern was archived. Try discovery or return home.</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/"><Button>Return Home</Button></Link>
            <Link href="/tailors"><Button variant="outline">Find Tailors</Button></Link>
            <Link href="/fabrics"><Button variant="secondary">Fabric Market</Button></Link>
          </CardContent>
        </Card>
        <div className="mt-6 text-xs text-muted-foreground dark:text-[#B8B5AE] text-center">If you believe this is an error, contact support via the Help Centre.</div>
      </div>
      <SiteFooter />
    </div>
  );
}
