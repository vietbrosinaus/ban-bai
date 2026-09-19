"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const STAGE_WIDTH = 1152;
const STAGE_HEIGHT = 720;

function FitStage({ className, children }: { className?: string; children: React.ReactNode }) {
  const frame = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const fit = () => {
      const { width, height } = element.getBoundingClientRect();
      setScale(Math.min(1, width / STAGE_WIDTH, height / STAGE_HEIGHT));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frame} data-slot="fit-stage" className={cn("grid min-h-0 min-w-0 place-items-center overflow-hidden", className)}>
      <div style={{ width: STAGE_WIDTH * scale, height: STAGE_HEIGHT * scale }}>
        <div style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export { FitStage };
