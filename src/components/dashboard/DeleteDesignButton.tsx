"use client";
import { Button } from "@/components/ui/button";

export function DeleteDesignButton({
  designId,
  title,
  slug,
  action,
}: {
  designId: string;
  title: string;
  slug: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm(`Delete "${title}"? This archives if bookings exist and affects public /tailors/${slug}. Continue?`)) {
      e.preventDefault();
    }
  };
  return (
    <form action={action} onSubmit={onSubmit}>
      <input type="hidden" name="designId" value={designId} />
      <Button type="submit" size="sm" variant="outline" className="h-7 text-xs text-burgundy border-burgundy/20">
        Delete
      </Button>
    </form>
  );
}
