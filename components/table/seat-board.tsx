"use client";

import * as React from "react";
import { CircleDot, Crosshair, Crown, Hourglass, Shield, ShieldPlus, Swords, type LucideIcon } from "lucide-react";

import { SEAT_SLOT_LABEL, type SeatSlot } from "@/lib/domain/card";
import { ROLE_LABEL } from "@/lib/domain/deck";
import { SLOT_ALLOWS, slotAllowsCard } from "@/lib/domain/table";
import { cn } from "@/lib/utils";

const SLOT_ICON: Record<SeatSlot, LucideIcon> = {
  general1: Crown,
  general2: Crown,
  weapon: Swords,
  armor: Shield,
  horsePlus: ShieldPlus,
  horseMinus: Crosshair,
  judgement: Hourglass,
};

const ROWS: SeatSlot[][] = [
  ["general1", "general2"],
  ["weapon", "armor", "horsePlus", "horseMinus"],
  ["judgement"],
];

const COMPACT_ROWS: SeatSlot[][] = [
  ["general1", "general2", "weapon", "armor"],
  ["horsePlus", "horseMinus", "judgement"],
];

function accepts(slot: SeatSlot) {
  const allowed = SLOT_ALLOWS[slot];
  return allowed ? `chỉ nhận ${allowed.map((role) => ROLE_LABEL[role].toLowerCase()).join(" hoặc ")}` : "nhận mọi lá";
}

function SeatBoard({
  seatId,
  self = false,
  compact = false,
  dragCardId,
  filled,
  counters,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  seatId: string;
  self?: boolean;
  compact?: boolean;
  dragCardId?: string | null;
  filled: (slot: SeatSlot) => React.ReactNode;
  counters?: React.ReactNode;
}) {
  return (
    <div data-slot="seat-board" className={cn("grid justify-items-center gap-1", className)} {...props}>
      {(compact && !self ? COMPACT_ROWS : ROWS).map((row, index) => (
        <div key={index} className="flex items-center gap-1">
          {row.map((slot) => {
            const content = filled(slot);
            const verdict = dragCardId ? (slotAllowsCard(slot, dragCardId) ? "allow" : "deny") : undefined;
            return (
              <div
                key={slot}
                data-slot-seat={seatId}
                data-slot={slot}
                data-verdict={verdict}
                title={`${SEAT_SLOT_LABEL[slot]}, ${accepts(slot)}`}
                className={cn(
                  "grid place-items-center rounded-[0.3rem] border border-dashed border-white/20 bg-black/20 transition-colors",
                  "hover:border-gilt/70 hover:bg-gilt/10",
                  "h-9 w-[1.6rem]",
                  compact && !self && "h-7 w-[1.25rem]",
                  self && "h-12 w-[2.15rem]",
                  content && "border-solid border-white/30 bg-transparent",
                  verdict === "allow" && "border-solid border-emerald-400/80 bg-emerald-400/15",
                  verdict === "deny" && "border-solid border-red-400/60 bg-red-400/10",
                )}
              >
                {content ?? React.createElement(SLOT_ICON[slot], {
                  className: cn("size-3.5 text-white/30", verdict === "allow" && "text-emerald-300", verdict === "deny" && "text-red-300/70"),
                })}
              </div>
            );
          })}
          {row.includes("judgement") ? (
            <div
              data-slot-seat={seatId}
              data-counter-zone=""
              title="Ô đếm"
              className={cn(
                "flex aspect-square items-center justify-center gap-1 rounded-full border border-dashed border-white/20 bg-black/20 transition-colors hover:border-gilt/70 hover:bg-gilt/10",
                self ? "size-12" : compact ? "size-7" : "size-9",
              )}
            >
              {counters ?? <CircleDot className="size-3.5 text-white/30" />}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export { SeatBoard };
