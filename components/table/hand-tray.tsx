import * as React from "react";
import type { VariantProps } from "class-variance-authority";

import { PlayingCard, playingCardVariants } from "@/components/table/playing-card";
import type { CardRef } from "@/lib/domain/card";
import { cn } from "@/lib/utils";

const SPREAD_DEGREES = 6;

function HandTray({
  cards,
  size,
  fan = true,
  renderCard,
  empty = "tay trống",
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof playingCardVariants> & {
    cards: CardRef[];
    fan?: boolean;
    renderCard?: (card: CardRef, index: number) => React.ReactNode;
    empty?: React.ReactNode;
  }) {
  const centre = (cards.length - 1) / 2;

  return (
    <div
      data-slot="hand-tray"
      data-count={cards.length}
      className={cn("flex justify-center", fan ? "items-center pt-2" : "items-end gap-1.5", className)}
      {...props}
    >
      {cards.map((card, index) => (
        <div
          key={card.id}
          data-slot="hand-card"
          className={cn(
            "origin-bottom cursor-grab transition-transform duration-150 hover:z-10 active:cursor-grabbing",
            fan ? "-mx-3.5 hover:-translate-y-3.5" : "hover:-translate-y-3"
          )}
          style={fan ? { rotate: `${(index - centre) * SPREAD_DEGREES}deg` } : undefined}
        >
          {renderCard?.(card, index) ?? <PlayingCard cardId={card.id} size={size} />}
        </div>
      ))}
      {!cards.length && <p className="self-center text-xs text-white/40">{empty}</p>}
    </div>
  );
}

export { HandTray };
