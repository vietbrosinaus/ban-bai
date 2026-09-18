"use client";

import * as React from "react";

import { SEAT_SLOT_LABEL, type SeatSlot } from "@/lib/domain/card";
import { cn } from "@/lib/utils";

const ROWS: SeatSlot[][] = [
  ["general1", "general2"],
  ["weapon", "armor", "horsePlus", "horseMinus"],
  ["judgement"],
];

function SeatBoard({
  seatId,
  self = false,
  filled,
  renderSlot,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  seatId: string;
  self?: boolean;
  filled: (slot: SeatSlot) => React.ReactNode;
  renderSlot?: (slot: SeatSlot) => React.ReactNode;
}) {
  return (
    <div
      data-slot="seat-board"
      className={cn("grid justify-items-center gap-1 rounded-xl p-1", self && "bg-black/15 ring-1 ring-gilt/25", className)}
      {...props}
    >
      {ROWS.map((row, index) => (
        <div key={index} className="flex gap-1">
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
                  slot === "judgement" ? "h-7 w-[4.4rem]" : "h-7 w-5",
                  self && (slot === "judgement" ? "h-9 w-24" : "h-9 w-6.5"),
                  content && "border-solid border-white/30 bg-transparent",
                )}
              >
                {content ?? renderSlot?.(slot) ?? (
                  <span className="text-[0.4rem] leading-none text-white/25">{SEAT_SLOT_LABEL[slot].slice(0, 2)}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export { SeatBoard, ROWS as SEAT_BOARD_ROWS };
