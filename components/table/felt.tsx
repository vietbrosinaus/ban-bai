import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const feltVariants = cva(
  "relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_42%,var(--felt-bright),var(--felt)_56%,var(--felt-deep))] [cursor:url(/cursor-hand.svg)_10_5,grab] [&_*]:[cursor:inherit] active:[cursor:url(/cursor-hand-grab.svg)_10_7,grabbing]",
  {
    variants: {
      shape: {
        oval: "rounded-[clamp(3.75rem,14vw,11.875rem)] shadow-[inset_0_0_0_11px_var(--rail),inset_0_0_0_13px_var(--rail-dark),inset_0_0_130px_rgba(0,0,0,0.32)]",
        near: "rounded-t-[2.5rem] rounded-b-xl shadow-[inset_0_0_130px_rgba(0,0,0,0.4)]",
        bare: "shadow-[inset_0_0_120px_rgba(0,0,0,0.3)]",
      },
    },
    defaultVariants: { shape: "oval" },
  }
);

function Felt({ shape, className, ...props }: React.ComponentProps<"div"> & VariantProps<typeof feltVariants>) {
  return <div data-slot="felt" data-shape={shape ?? "oval"} className={cn(feltVariants({ shape }), className)} {...props} />;
}

export { Felt, feltVariants };
