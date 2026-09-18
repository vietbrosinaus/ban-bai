import * as React from "react";

import { MetaList } from "@/components/ui/meta-list";
import { cn } from "@/lib/utils";

function SeatBadge({
  name,
  colour,
  handCount,
  seatNumber,
  distance,
  active = false,
  self = false,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  name: string;
  colour: string;
  handCount: number;
  seatNumber?: number;
  distance?: number;
  active?: boolean;
  self?: boolean;
}) {
  const fanned = Math.min(handCount, 7);
  const centre = (fanned - 1) / 2;

  return (
    <div
      data-slot="seat-badge"
      data-active={active || undefined}
      data-self={self || undefined}
      className={cn(
        "flex w-[6.5rem] flex-col items-center gap-1 rounded-2xl border border-white/10 bg-felt-deep/75 px-2 py-1.5 backdrop-blur-[2px] transition-shadow",
        self && "border-gilt/60 shadow-[0_0_0_1px_var(--gilt)]",
        active && "shadow-[0_0_1.2rem_rgba(244,201,93,0.45)]",
        className
      )}
      {...props}
    >
      <div className="flex h-6 items-end">
        {fanned > 0 ? (
          Array.from({ length: fanned }, (_, index) => (
            <span
              key={index}
              className="-ml-[6px] h-5 w-3 origin-bottom rounded-[2px] border border-black/40 bg-[repeating-linear-gradient(45deg,var(--card-back),var(--card-back)_3px,var(--card-back-weave)_3px,var(--card-back-weave)_6px)]"
              style={{ rotate: `${(index - centre) * 10}deg` }}
            />
          ))
        ) : (
          <span className="h-5 w-8 rounded-[3px] border border-dashed border-white/20" />
        )}
      </div>
      <b className="max-w-full truncate text-[0.72rem] leading-none font-semibold" style={{ color: colour }}>{name}</b>
      <MetaList className="text-[0.55rem] leading-none text-white/45">
        <span>{handCount} lá</span>
        {seatNumber === undefined ? null : <span>ghế {seatNumber}</span>}
        {distance === undefined ? null : <span>xa {distance}</span>}
      </MetaList>
    </div>
  );
}

export { SeatBadge };
