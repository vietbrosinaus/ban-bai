"use client";

import * as React from "react";

import { useGlide } from "@/hooks/use-glide";
import { PRESENCE } from "@/lib/domain/presence";
import { cn } from "@/lib/utils";

const OPEN = (
  <>
    <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
    <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </>
);

const CLOSED = (
  <>
    <path d="M18 11.5V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1.4" />
    <path d="M14 10V8a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
    <path d="M10 9.9V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v5" />
    <path d="M6 14a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
    <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8 2 2 0 1 1 4 0" />
  </>
);

function PlayerCursor({
  x,
  y,
  colour,
  name,
  grabbing = false,
  self = false,
  className,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  x: number;
  y: number;
  colour: string;
  name: string;
  grabbing?: boolean;
  self?: boolean;
}) {
  const ref = useGlide<HTMLDivElement>(x, y, self ? 0 : PRESENCE.glideMs);
  return (
    <div
      ref={ref}
      data-slot="player-cursor"
      data-grabbing={grabbing || undefined}
      {...props}
      className={cn("pointer-events-none absolute z-50 -translate-x-1 -translate-y-0.5", className)}
      style={{ color: colour, ...style }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="size-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.55)]" aria-hidden>
        {grabbing ? CLOSED : OPEN}
      </svg>
      {!self && (
        <span className="absolute top-5 left-6 rounded-full px-2 py-px text-[0.58rem] font-bold whitespace-nowrap text-[#10201a]" style={{ background: colour }}>
          {name}
        </span>
      )}
    </div>
  );
}

export { PlayerCursor };
