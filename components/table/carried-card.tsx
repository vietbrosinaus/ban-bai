"use client";

import * as React from "react";

import { CardBack } from "@/components/table/playing-card";
import { useGlide } from "@/hooks/use-glide";
import { PRESENCE } from "@/lib/domain/presence";
import type { CardBackKind } from "@/lib/domain/protocol";

function CarriedCard({ x, y, back, colour }: { x: number; y: number; back: CardBackKind; colour: string }) {
  const ref = useGlide<HTMLDivElement>(x, y, PRESENCE.glideMs);
  return (
    <div
      ref={ref}
      data-slot="carried-card"
      className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 rotate-[-6deg] drop-shadow-[0_0.9rem_1.2rem_rgba(0,0,0,0.45)]"
    >
      <CardBack kind={back} size="xs" className="ring-2" style={{ "--tw-ring-color": colour } as React.CSSProperties} />
    </div>
  );
}

export { CarriedCard };
