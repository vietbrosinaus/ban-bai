import * as React from "react";
import type { VariantProps } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import { PlayingCard, playingCardVariants } from "@/components/table/playing-card";
import type { CardRef } from "@/lib/domain/card";
import { cn } from "@/lib/utils";

const DEPTH_LAYERS = 3;

function CardStack({
  cards,
  label,
  size,
  peeking = false,
  showCount = true,
  className,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof playingCardVariants> & {
    cards: CardRef[];
    label?: string;
    peeking?: boolean;
    showCount?: boolean;
  }) {
  const top = cards[cards.length - 1];
  const depth = Math.min(DEPTH_LAYERS, Math.max(0, cards.length - 1));

  return (
    <div data-slot="card-stack" data-count={cards.length} className={cn("relative isolate w-fit", className)} {...props}>
      {Array.from({ length: depth }, (_, index) => (
        <span
          key={index}
          className={cn(playingCardVariants({ size }), "absolute inset-0 -z-10 h-full w-full bg-[#e8dcc0] shadow-sm")}
          style={{ transform: `translate(${(depth - index) * 3}px, ${(depth - index) * 3}px)` }}
        />
      ))}
      {top ? (
        <PlayingCard cardId={top.id} faceDown={!top.faceUp && !peeking} size={size} />
      ) : (
        <div className={cn(playingCardVariants({ size }), "grid place-items-center border-2 border-dashed border-white/25 bg-black/15 text-center text-[0.55rem] leading-tight text-white/40 shadow-[inset_0_2px_10px_rgba(0,0,0,0.35)] ring-0")}>
          {label}
        </div>
      )}
      {showCount && cards.length > 1 && (
        <Badge variant="destructive" className="absolute -top-2 -right-2 z-10 min-w-6 justify-center border-2 border-felt-deep tabular-nums">
          {cards.length}
        </Badge>
      )}
      {label && cards.length > 0 && (
        <Badge variant="secondary" className="absolute top-full left-1/2 z-10 mt-2 -translate-x-1/2 border border-gilt-dim/30 bg-felt-deep/90 text-[0.6rem] whitespace-nowrap text-gilt-dim">
          {label}
        </Badge>
      )}
    </div>
  );
}

export { CardStack };
