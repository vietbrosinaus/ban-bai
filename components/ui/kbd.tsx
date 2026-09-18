import * as React from "react";

import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-md border border-border bg-muted px-2 font-sans text-[0.7rem] font-semibold whitespace-nowrap text-foreground shadow-[0_1px_0_var(--border)]",
        className
      )}
      {...props}
    />
  );
}

export { Kbd };
