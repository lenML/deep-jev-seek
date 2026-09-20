import { forwardRef, type LabelHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground", className)}
      {...props}
    />
  ),
);
Label.displayName = "Label";
