import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-plum text-white hover:bg-plum/90 shadow-soft hover:shadow-card border border-plum/10 dark:bg-[#C6A15B] dark:text-[#191919] dark:border-[#C6A15B] dark:hover:bg-[#B08E4E] dark:shadow-[0_0_12px_rgba(198,161,91,0.25)]",
        primary: "bg-plum text-white hover:bg-[#6a345f] shadow-card dark:bg-[#C6A15B] dark:text-[#191919] dark:hover:bg-[#B08E4E]",
        emerald: "bg-emeraldDeep text-white hover:bg-[#1a6b4a] shadow-soft dark:bg-emeraldDeep dark:border dark:border-emerald-500/20",
        gold: "bg-gold text-midnight hover:bg-[#d2b06f] shadow-gold font-semibold dark:bg-[#C6A15B] dark:text-[#191919] dark:border-[#C6A15B] dark:shadow-[0_0_12px_rgba(198,161,91,0.3)]",
        secondary: "bg-champagne text-midnight hover:bg-[#dfcdaa] border border-gold/20 dark:bg-[#303030] dark:text-[#F5F3EF] dark:border-[#3A3936] dark:hover:bg-[#3A3936]",
        outline: "border border-midnight/15 bg-white hover:bg-ivory text-midnight dark:bg-[#292929] dark:border-[#3A3936] dark:text-[#F5F3EF] dark:hover:bg-[#303030]",
        ghost: "hover:bg-plum/5 hover:text-plum dark:text-[#F5F3EF]/80 dark:hover:bg-[#303030] dark:hover:text-[#C6A15B]",
        link: "text-plum underline-offset-4 hover:underline dark:text-[#C6A15B]",
        glass: "glass hover:bg-white/85 text-midnight border-white/60 dark:bg-[#242424] dark:text-[#F5F3EF] dark:border-[#3A3936] dark:hover:bg-[#303030]",
        dark: "bg-midnight text-ivory hover:bg-midnight/90 border border-white/10 dark:bg-[#303030] dark:text-[#F5F3EF] dark:border-[#3A3936] dark:hover:bg-[#3A3936]",
      },
      size: { default: "h-10 px-6 py-2", sm: "h-8 px-4 text-xs tracking-wide", lg: "h-11 px-8 text-[15px]", icon: "h-9 w-9" },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
));
Button.displayName = "Button";
export { Button, buttonVariants };
