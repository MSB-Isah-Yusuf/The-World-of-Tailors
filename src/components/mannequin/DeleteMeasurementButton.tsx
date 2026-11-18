"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteMeasurementButton({
  id,
  displayName,
  garmentType,
  variant = "card",
}: {
  id: string;
  displayName?: string;
  garmentType?: string;
  variant?: "card" | "detail" | "icon";
}) {
  const [deleting, setDeleting] = React.useState(false);

  const handleDelete = async () => {
    const name = displayName || "this measurement record";
    const extra = garmentType ? ` (${garmentType})` : "";
    const msg = `Delete measurement record for "${name}"${extra}?\n\n• This permanently removes the profile + its values\n• Booking snapshots already frozen are kept\n• History for this profile will be removed but an audit log is kept\n• This cannot be undone\n\nContinue?`;
    if (!confirm(msg)) return;
    // second confirm if linked booking exists - we fetch profile first
    try {
      setDeleting(true);
      const res = await fetch(`/api/tailor/measurements/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(j.error || "Delete failed — check ownership or try again");
        setDeleting(false);
        return;
      }
      // success - redirect to list with flash
      const archived = j.archived ? "?deleted=archived" : "?deleted=1";
      window.location.href = `/dashboard/tailor/measurements${archived}`;
    } catch (e: any) {
      alert(e.message || "Delete failed");
      setDeleting(false);
    }
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="h-7 w-7 grid place-items-center rounded-full border bg-white dark:bg-[#292929] dark:border-[#3A3936] text-burgundy hover:bg-burgundy/10 dark:hover:bg-burgundy/20 disabled:opacity-50"
        aria-label="Delete measurement"
        title="Delete measurement record"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    );
  }

  if (variant === "detail") {
    return (
      <Button
        onClick={handleDelete}
        disabled={deleting}
        variant="outline"
        size="sm"
        className="h-7 text-xs text-burgundy border-burgundy/20 hover:bg-burgundy/10 dark:border-burgundy/30 dark:hover:bg-burgundy/20"
      >
        <Trash2 className="h-3 w-3 mr-1" />
        {deleting ? "Deleting…" : "Delete record"}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleDelete}
      disabled={deleting}
      variant="outline"
      size="sm"
      className="h-7 text-xs text-burgundy border-burgundy/20 hover:bg-burgundy/10 dark:border-burgundy/30 dark:text-[#F5F3EF] flex-1"
    >
      <Trash2 className="h-3 w-3 mr-1" />
      {deleting ? "Deleting…" : "Delete"}
    </Button>
  );
}
