import * as React from "react";

import { cn } from "@/lib/utils";

function CounterChip({
  label,
  value,
  colour = "var(--gilt)",
  className,
  ...props
}: React.ComponentProps<"button"> & { label: string; value: number; colour?: string }) {
  return (
    <button
      data-slot="counter-chip"
      type="button"
      className={cn(
        "grid aspect-square size-12 place-items-center rounded-full border-2 border-black/25 text-[#10201a] shadow-[0_0.4rem_0.7rem_rgba(0,0,0,0.35)] transition-transform [container-type:inline-size] hover:scale-105 active:scale-95",
        className
      )}
      style={{ background: colour }}
      {...props}
    >
      <b className="text-[30cqw] leading-none font-extrabold tabular-nums">{value}</b>
      <span className="max-w-full truncate px-0.5 text-[15cqw] leading-none font-semibold tracking-wide uppercase opacity-70">{label}</span>
    </button>
  );
}

export { CounterChip };
