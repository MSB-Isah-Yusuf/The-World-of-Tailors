"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#FFFBF0] dark:bg-[#191919] grid place-items-center p-6">
      <Card className="max-w-lg w-full dark:bg-[#292929] dark:border-[#3A3936]">
        <CardHeader>
          <CardTitle className="dark:text-[#F5F3EF]">Something went wrong</CardTitle>
          <p className="text-sm text-muted-foreground dark:text-[#B8B5AE]">{error.message || "Unexpected error — our atelier log has recorded it."}</p>
          {error.digest && <p className="text-xs text-muted-foreground dark:text-[#85827D]">Ref: {error.digest}</p>}
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Link href="/"><Button variant="outline">Home</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}
