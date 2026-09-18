import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { SUIT_SYMBOL, isRed, type Suit } from "@/lib/domain/card";
import { cn } from "@/lib/utils";

const suitMarkVariants = cva("font-serif leading-none not-italic", {
  variants: {
    colour: {
      red: "text-[#d84936]",
      black: "text-inherit",
    },
  },
  defaultVariants: { colour: "black" },
});

const SUIT_NAME: Record<Suit, string> = {
  spades: "bích",
  hearts: "cơ",
  diamonds: "rô",
  clubs: "tép",
};

function SuitMark({ suit, className, ...props }: Omit<React.ComponentProps<"i">, "color"> & VariantProps<typeof suitMarkVariants> & { suit: Suit }) {
  return (
    <i
      data-slot="suit-mark"
      data-suit={suit}
      role="img"
      aria-label={SUIT_NAME[suit]}
      className={cn(suitMarkVariants({ colour: isRed(suit) ? "red" : "black" }), className)}
      {...props}
    >
      {SUIT_SYMBOL[suit]}
    </i>
  );
}

export { SuitMark, SUIT_NAME };
