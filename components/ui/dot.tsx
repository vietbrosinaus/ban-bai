import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const dotVariants = cva("inline-block shrink-0 rounded-full bg-current", {
  variants: {
    size: {
      xs: "size-[0.2em]",
      sm: "size-[0.28em]",
      md: "size-1.5",
      lg: "size-2",
    },
    tone: {
      muted: "opacity-45",
      solid: "opacity-100",
    },
  },
  defaultVariants: { size: "sm", tone: "muted" },
});

function Dot({ size, tone, className, ...props }: React.ComponentProps<"span"> & VariantProps<typeof dotVariants>) {
  return <span data-slot="dot" aria-hidden className={cn(dotVariants({ size, tone }), className)} {...props} />;
}

export { Dot, dotVariants };
