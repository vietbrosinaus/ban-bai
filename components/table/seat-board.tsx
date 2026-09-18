"use client";

import * as React from "react";
import { CircleDot, Crosshair, Crown, Hourglass, Shield, ShieldPlus, Swords, type LucideIcon } from "lucide-react";

import { SEAT_SLOT_LABEL, type SeatSlot } from "@/lib/domain/card";
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

function SeatBoard({
  seatId,
  self = false,
  filled,
  counters,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  seatId: string;
  self?: boolean;
  filled: (slot: SeatSlot) => React.ReactNode;
  counters?: React.ReactNode;
}) {
  return (
    <div
      data-slot="seat-board"
      className={cn("grid justify-items-center gap-1 rounded-xl p-1", self && "bg-black/15 ring-1 ring-gilt/25", className)}
      {...props}
    >
      {ROWS.map((row, index) => (
        <div key={index} className="flex items-center gap-1">
          {row.map((slot) => {
            const content = filled(slot);
            return (
              <div
                key={slot}
                data-slot-seat={seatId}
                data-slot={slot}
                title={SEAT_SLOT_LABEL[slot]}
                className={cn(
                  "grid place-items-center rounded-[0.3rem] border border-dashed border-white/20 bg-black/20 transition-colors",
                  "hover:border-gilt/70 hover:bg-gilt/10",
                  slot === "judgement" ? "h-11 w-[3.6rem]" : "h-11 w-8",
                  self && (slot === "judgement" ? "h-[3.85rem] w-[5rem]" : "h-[3.85rem] w-11"),
                  content && "border-solid border-white/30 bg-transparent",
                )}
              >
                {content ?? React.createElement(SLOT_ICON[slot], { className: "size-3.5 text-white/30" })}
              </div>
            );
          })}
          {row[0] === "judgement" ? (
            <div
              data-slot-seat={seatId}
              data-counter-zone=""
              title="Ô đếm"
              className={cn(
                "flex aspect-square items-center justify-center gap-1 rounded-full border border-dashed border-white/20 bg-black/20 transition-colors hover:border-gilt/70 hover:bg-gilt/10",
                self ? "size-[3.85rem]" : "size-11",
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

export { SeatBoard, ROWS as SEAT_BOARD_ROWS };
