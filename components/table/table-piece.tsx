import * as React from "react";

import { cn } from "@/lib/utils";

function TablePiece({
  x,
  y,
  rotation = 0,
  held = false,
  selected = false,
  className,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  x: number;
  y: number;
  rotation?: number;
  held?: boolean;
  selected?: boolean;
}) {
  return (
    <div
      data-slot="table-piece"
      data-held={held || undefined}
      data-selected={selected || undefined}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none select-none active:cursor-grabbing",
        held && "z-50 drop-shadow-[0_1.1rem_1.6rem_rgba(0,0,0,0.5)]",
        selected && "outline-2 outline-offset-4 outline-gilt",
        className
      )}
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, rotate: `${rotation}deg`, ...style }}
      {...props}
    />
  );
}

export { TablePiece };
