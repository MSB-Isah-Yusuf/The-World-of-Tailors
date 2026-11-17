import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default function Forbidden() {
  return (
    <div className="min-h-screen bg-[#FFFBF0] dark:bg-[#191919] grid place-items-center p-6">
      <Card className="max-w-lg w-full dark:bg-[#292929] dark:border-[#3A3936]">
        <CardHeader><CardTitle className="dark:text-[#F5F3EF]">403 — Access denied</CardTitle><p className="text-sm text-muted-foreground dark:text-[#B8B5AE]">Least-privilege RBAC enforced. Your role does not have permission for this resource.</p></CardHeader>
        <CardContent className="flex gap-3"><Link href="/login"><Button>Sign in</Button></Link><Link href="/"><Button variant="outline">Home</Button></Link></CardContent>
      </Card>
    </div>
  );
}
