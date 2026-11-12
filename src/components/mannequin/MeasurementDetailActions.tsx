"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function MeasurementDetailActions({ id }: { id: string }) {
  return (
    <div className="mt-2 flex gap-2">
      <Link href={`/dashboard/tailor/measurements/${id}?edit=1`}>
        <Button size="sm" variant="outline" className="h-7 text-xs">Edit</Button>
      </Link>
      <button
        type="button"
        onClick={(e) => e.preventDefault()}
        className="text-xs underline self-center"
      >
        View history
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="text-xs underline self-center"
      >
        Print sheet
      </button>
      <a href={`/api/tailor/measurements/${id}/export`} className="text-xs underline self-center">
        Export JSON
      </a>
    </div>
  );
}
