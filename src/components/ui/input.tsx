import * as React from "react";
import { cn } from "@/lib/utils";
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input type={type} className={cn("flex h-10 w-full rounded-xl border border-input bg-white dark:bg-[#202020] dark:border-[#3A3936] text-foreground dark:text-[#F5F3EF] placeholder:text-muted-foreground/70 dark:placeholder:text-[#85827D] dark:placeholder:opacity-100 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]/40 focus-visible:border-[#C6A15B] dark:focus-visible:border-[#C6A15B]/60", className)} ref={ref} {...props} />
));
Input.displayName = "Input";
export { Input };
