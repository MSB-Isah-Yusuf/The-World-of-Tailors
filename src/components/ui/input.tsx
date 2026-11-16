import * as React from "react";
import { cn } from "@/lib/utils";
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input type={type} className={cn("flex h-10 w-full rounded-xl border border-input bg-white dark:bg-midnight/60 dark:border-white/15 text-foreground placeholder:text-muted-foreground/70 dark:placeholder:text-ivory/45 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold dark:focus-visible:border-gold/50", className)} ref={ref} {...props} />
));
Input.displayName = "Input";
export { Input };
