import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { SuitMark } from "@/components/table/suit-mark";
import { MetaList } from "@/components/ui/meta-list";
import { cardFace } from "@/lib/domain/deck";
import { FACTION_LABEL, type CardId, type Faction, type Suit } from "@/lib/domain/card";
import { cn } from "@/lib/utils";

const playingCardVariants = cva(
  "relative aspect-[5/7] shrink-0 select-none overflow-hidden rounded-[7%] bg-card-face bg-cover bg-center shadow-[0_0.4rem_0.8rem_rgba(0,0,0,0.32)] ring-1 ring-card-edge [container-type:inline-size]",
  {
    variants: {
      size: {
        xs: "w-11",
        sm: "w-14",
        md: "w-[4.625rem]",
        lg: "w-24",
      },
      face: {
        up: "",
        down: "bg-card-back ring-2 ring-gilt [background-image:repeating-linear-gradient(45deg,var(--card-back),var(--card-back)_0.4em,var(--card-back-weave)_0.4em,var(--card-back-weave)_0.8em)]",
      },
    },
    defaultVariants: { size: "md", face: "up" },
  }
);

const FACTION_RING: Record<Faction, string> = {
  wei: "ring-2 ring-faction-wei",
  shu: "ring-2 ring-faction-shu",
  wu: "ring-2 ring-faction-wu",
  qun: "ring-2 ring-faction-qun",
};

const FACTION_FILL: Record<Faction, string> = {
  wei: "bg-faction-wei",
  shu: "bg-faction-shu",
  wu: "bg-faction-wu",
  qun: "bg-faction-qun",
};

export { FACTION_FILL, FACTION_RING };

function CardCorner({ rank, suit, className }: { rank: string; suit: Suit; className?: string }) {
  return (
    <span
      className={cn(
        "absolute flex flex-col items-center rounded-[3cqw] border border-black/15 bg-[#fffdf7] px-[3cqw] py-[1cqw] font-serif text-[13cqw] leading-none shadow-[0_1px_2px_rgba(0,0,0,0.35)]",
        className,
      )}
    >
      <b className="font-bold text-[#17241f]">{rank}</b>
      <SuitMark suit={suit} className="text-[0.92em]" />
    </span>
  );
}

function PlayingCard({
  cardId,
  faceDown = false,
  size,
  className,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof playingCardVariants> & { cardId: CardId; faceDown?: boolean }) {
  const card = cardFace(cardId);
  const general = card?.kind === "general";
  const face = faceDown ? "down" : "up";

  return (
    <div
      data-slot="playing-card"
      data-face={face}
      data-kind={card?.kind ?? "unknown"}
      data-faction={card?.faction}
      className={cn(
        playingCardVariants({ size, face }),
        general && !faceDown && card?.faction && FACTION_RING[card.faction],
        general && faceDown && "ring-[#c9973f] [background-image:repeating-linear-gradient(45deg,#4a2f18,#4a2f18_0.4em,#6b4b21_0.4em,#6b4b21_0.8em)]",
        className
      )}
      style={!faceDown && card?.art ? { backgroundImage: `url("${card.art}")` } : undefined}
      title={faceDown ? undefined : card?.name}
      {...props}
    >
      {faceDown && (
        <span className="absolute inset-0 grid place-items-center">
          <i className="grid aspect-square w-[45%] rotate-45 place-items-center border border-gilt font-serif text-[16cqw] font-extrabold text-gilt not-italic">
            <span className="-rotate-45">{general ? "將" : "殺"}</span>
          </i>
        </span>
      )}
      {!faceDown && card && !general && (
        <>
          <CardCorner rank={card.rank} suit={card.suit} className="top-[4cqw] left-[4cqw]" />
          <CardCorner rank={card.rank} suit={card.suit} className="right-[4cqw] bottom-[4cqw]" />
          {!card.art && <SuitMark suit={card.suit} className="absolute inset-0 grid place-items-center text-[45cqw] opacity-30" />}
        </>
      )}
      {!faceDown && general && card && (
        <>
          {card.faction && <span className={cn("absolute inset-x-0 top-0 h-[4cqw]", FACTION_FILL[card.faction])} />}
          <span className="absolute inset-x-0 bottom-0 grid gap-px bg-gradient-to-t from-black/90 to-transparent px-[5cqw] pt-[18cqw] pb-[4cqw] text-left text-white">
            <b className="truncate text-[12cqw] leading-tight font-semibold">{card.name}</b>
            <small className="flex items-center gap-[0.4em] overflow-hidden text-[8cqw] font-bold tracking-wide whitespace-nowrap text-white/80">
              {card.faction && <span className={cn("size-[0.75em] shrink-0 rounded-full ring-1 ring-white/50", FACTION_FILL[card.faction])} />}
              <MetaList className="min-w-0">
                {card.faction && <span className="truncate">{FACTION_LABEL[card.faction]}</span>}
                <span className="shrink-0">{card.maxHp} HP</span>
              </MetaList>
            </small>
          </span>
        </>
      )}
    </div>
  );
}

export { PlayingCard, playingCardVariants };
