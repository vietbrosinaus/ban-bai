import * as React from "react";
import type { VariantProps } from "class-variance-authority";

import { PlayingCard, playingCardVariants } from "@/components/table/playing-card";
import type { CardRef } from "@/lib/domain/card";
import { cn } from "@/lib/utils";

const SPREAD_DEGREES = 6;
const MAX_FAN_DEGREES = 36;

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
  const step = cards.length > 1 ? Math.min(SPREAD_DEGREES, MAX_FAN_DEGREES / (cards.length - 1)) : 0;

  return (
    <div
      data-slot="hand-tray"
      data-count={cards.length}
      className={cn("flex w-full min-w-0 justify-center", fan ? "items-center pt-2 pr-5" : "items-end gap-1.5", className)}
      {...props}
    >
      {cards.map((card, index) => (
        <div
          key={card.id}
          data-slot="hand-card"
          className={cn(
            "origin-bottom cursor-grab transition-transform duration-150 hover:z-10 active:cursor-grabbing",
            fan ? "min-w-0 shrink basis-[2.25rem] hover:-translate-y-3.5" : "hover:-translate-y-3"
          )}
          style={fan ? { rotate: `${(index - centre) * step}deg` } : undefined}
        >
          {renderCard?.(card, index) ?? <PlayingCard cardId={card.id} size={size} />}
        </div>
      ))}
      {!cards.length && <div className="self-center">{empty}</div>}
    </div>
  );
}

export { HandTray };
