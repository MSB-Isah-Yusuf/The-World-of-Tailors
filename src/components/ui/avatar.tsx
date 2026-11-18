"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export function getInitials(name?: string | null): string {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  if (parts.length === 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  // 3+ names: first + middle (per spec: John Michael Smith -> JM)
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const sizeClasses: Record<string, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

export function UserAvatar({
  name,
  image,
  size = "md",
  className,
  unoptimized,
}: {
  name?: string | null;
  image?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  unoptimized?: boolean;
}) {
  const [imgError, setImgError] = React.useState(false);
  const initials = getInitials(name);
  const showImage = image && !imgError && image.trim() !== "";

  return (
    <div
      className={cn(
        "shrink-0 rounded-full overflow-hidden grid place-items-center border font-semibold select-none",
        "bg-ivory dark:bg-[#303030] border-midnight/10 dark:border-[#3A3936]",
        "text-midnight dark:text-[#F5F3EF]",
        sizeClasses[size],
        className
      )}
      aria-label={name ? `${name} avatar` : "User avatar"}
      title={name || undefined}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image!}
          alt={name ? `${name} profile picture` : "Profile picture"}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="uppercase tracking-wide font-bold">{initials}</span>
      )}
    </div>
  );
}

export function AvatarGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex items-center", className)}>{children}</div>;
}
