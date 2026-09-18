import * as React from "react";
import type { VariantProps } from "class-variance-authority";

import { Dot, dotVariants } from "@/components/ui/dot";
import { cn } from "@/lib/utils";

function MetaList({
  size,
  tone,
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof dotVariants>) {
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <span data-slot="meta-list" className={cn("inline-flex min-w-0 items-center gap-[0.45em]", className)} {...props}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <Dot size={size} tone={tone} />}
          {item}
        </React.Fragment>
      ))}
    </span>
  );
}

export { MetaList };
