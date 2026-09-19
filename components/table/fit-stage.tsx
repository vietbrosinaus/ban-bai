"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const LONG_SIDE = 1152;
const SHORT_SIDE = 720;

type Stage = { scale: number; width: number; height: number };

function FitStage({ className, children }: { className?: string; children: React.ReactNode }) {
  const frame = React.useRef<HTMLDivElement>(null);
  const [stage, setStage] = React.useState<Stage>({ scale: 1, width: LONG_SIDE, height: SHORT_SIDE });

  React.useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const fit = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      const landscape = width >= height;
      const scale = Math.min(1, width / (landscape ? LONG_SIDE : SHORT_SIDE), height / (landscape ? SHORT_SIDE : LONG_SIDE));
      setStage({ scale, width: width / scale, height: height / scale });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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
