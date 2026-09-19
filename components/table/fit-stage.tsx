"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const MAX_SCALE = 1.35;

export const STAGE_BY_SEATS: ReadonlyArray<{ upTo: number; long: number; short: number; tallWidth: number }> = [
  { upTo: 3, long: 900, short: 560, tallWidth: 620 },
  { upTo: 5, long: 1000, short: 625, tallWidth: 780 },
  { upTo: 7, long: 1100, short: 690, tallWidth: 780 },
  { upTo: Infinity, long: 1200, short: 750, tallWidth: 960 },
];

function stageFor(seats: number) {
  return STAGE_BY_SEATS.find((step) => seats <= step.upTo) ?? STAGE_BY_SEATS[STAGE_BY_SEATS.length - 1];
}

type Stage = { scale: number; width: number; height: number };

function FitStage({ seats, className, children }: { seats: number; className?: string; children: React.ReactNode }) {
  const frame = React.useRef<HTMLDivElement>(null);
  const [stage, setStage] = React.useState<Stage>({ scale: 1, width: 1152, height: 720 });

  React.useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const { long, short, tallWidth } = stageFor(seats);
    const fit = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      const landscape = width >= height;
      const scale = Math.min(MAX_SCALE, width / (landscape ? long : tallWidth), height / (landscape ? short : long));
      setStage({ scale, width: width / scale, height: height / scale });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [seats]);

  return (
    <div ref={frame} data-slot="fit-stage" className={cn("relative size-full min-h-0 min-w-0 overflow-hidden", className)}>
      <div
        className="absolute top-0 left-0"
        style={{ width: stage.width, height: stage.height, transform: `scale(${stage.scale})`, transformOrigin: "top left" }}
      >
        {children}
      </div>
    </div>
  );
}

export { FitStage };
