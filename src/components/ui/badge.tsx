import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors", {
  variants: {
    variant: { default: "border-transparent bg-midnight text-white dark:bg-gold dark:text-midnight dark:border-gold/50", plum: "bg-plum text-white border-plum dark:bg-plum dark:border-plum", emerald: "bg-emeraldDeep text-white dark:bg-emeraldDeep dark:border-emerald-500/30", gold: "bg-gold text-midnight border-gold dark:bg-gold dark:text-midnight", burgundy: "bg-burgundy text-white dark:bg-burgundy", secondary: "bg-champagne text-midnight border-gold/20 dark:bg-white/[0.08] dark:text-ivory dark:border-white/15", outline: "text-foreground dark:text-ivory dark:border-white/20", success: "bg-emeraldDeep text-white dark:bg-emerald-600 dark:border-emerald-500/30", warning: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30", muted: "bg-ivory text-taupe border-midnight/10 dark:bg-white/[0.06] dark:text-ivory/70 dark:border-white/10" },
  }, defaultVariants: { variant: "default" }
});
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
function Badge({ className, variant, ...props }: BadgeProps) { return <div className={cn(badgeVariants({ variant }), className)} {...props} />; }
export { Badge, badgeVariants };
