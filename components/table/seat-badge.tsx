import * as React from "react";

import { MetaList } from "@/components/ui/meta-list";
import { cn } from "@/lib/utils";

function SeatBadge({
  name,
  colour,
  handCount,
  seatNumber,
  active = false,
  self = false,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  name: string;
  colour: string;
  handCount: number;
  seatNumber?: number;
  active?: boolean;
  self?: boolean;
}) {
  return (
    <div
      data-slot="seat-badge"
      data-active={active || undefined}
      data-self={self || undefined}
      className={cn(
        "flex w-[6.25rem] flex-col items-center gap-1 rounded-xl border border-white/10 bg-felt-deep/80 px-2 py-1.5 backdrop-blur-[2px] transition-shadow",
        self && "border-gilt/60 shadow-[0_0_0_1px_var(--gilt)]",
        active && "shadow-[0_0_1.2rem_rgba(244,201,93,0.45)]",
        className
      )}
      {...props}
    >
      <b className="max-w-full truncate text-[0.78rem] leading-none font-semibold" style={{ color: colour }}>{name}</b>
      <MetaList className="text-[0.6rem] leading-none text-white/50">
        <span className="tabular-nums">{handCount} lá</span>
        {seatNumber === undefined ? null : <span className="tabular-nums">ghế {seatNumber}</span>}
      </MetaList>
    </div>
  );
}

export { SeatBadge };
