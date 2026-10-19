import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors", {
  variants: {
    variant: { default: "border-transparent bg-midnight text-white", plum: "bg-plum text-white border-plum", emerald: "bg-emeraldDeep text-white", gold: "bg-gold text-midnight border-gold", burgundy: "bg-burgundy text-white", secondary: "bg-champagne text-midnight border-gold/20", outline: "text-foreground", success: "bg-emeraldDeep text-white", warning: "bg-amber-100 text-amber-800 border-amber-200", muted: "bg-ivory text-taupe border-midnight/10" },
  }, defaultVariants: { variant: "default" }
});
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
function Badge({ className, variant, ...props }: BadgeProps) { return <div className={cn(badgeVariants({ variant }), className)} {...props} />; }
export { Badge, badgeVariants };
