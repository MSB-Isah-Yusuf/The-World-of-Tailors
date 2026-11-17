import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors", {
  variants: {
    variant: { default: "border-transparent bg-midnight text-white dark:bg-[#F16A24] dark:text-white dark:border-[#F16A24]", plum: "bg-plum text-white border-plum dark:bg-[#F16A24] dark:border-[#F16A24] dark:text-white", emerald: "bg-emeraldDeep text-white dark:bg-emeraldDeep dark:border-emerald-500/30", gold: "bg-gold text-midnight border-gold dark:bg-[#E8B94E] dark:text-[#191919] dark:border-[#E8B94E]", burgundy: "bg-burgundy text-white dark:bg-burgundy", secondary: "bg-champagne text-midnight border-gold/20 dark:bg-[#303030] dark:text-[#F5F3EF] dark:border-[#3A3936]", outline: "text-foreground dark:text-[#F5F3EF] dark:border-[#3A3936]", success: "bg-emeraldDeep text-white dark:bg-[#49B77A] dark:text-white dark:border-[#49B77A]/50", warning: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-[#E8B94E]/15 dark:text-[#FDE68A] dark:border-[#E8B94E]/30", muted: "bg-ivory text-taupe border-midnight/10 dark:bg-[#242424] dark:text-[#B8B5AE] dark:border-[#3A3936]" },
  }, defaultVariants: { variant: "default" }
});
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
function Badge({ className, variant, ...props }: BadgeProps) { return <div className={cn(badgeVariants({ variant }), className)} {...props} />; }
export { Badge, badgeVariants };
