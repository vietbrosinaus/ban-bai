"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

const SETTLED = 0.0004;

function place(element: HTMLElement, x: number, y: number) {
  element.style.left = `${x * 100}%`;
  element.style.top = `${y * 100}%`;
}

export function useGlide<T extends HTMLElement>(x: number, y: number, lagMs: number) {
  const ref = useRef<T>(null);
  const target = useRef({ x, y });
  const shown = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef<number | null>(null);

  useLayoutEffect(() => {
    target.current = { x, y };
    const element = ref.current;
    if (!element) return;

    if (!shown.current || lagMs <= 0) {
      shown.current = { x, y };
      place(element, x, y);
      return;
    }
    if (frame.current !== null) return;

    let last = performance.now();
    const step = (now: number) => {
      const from = shown.current!;
      const to = target.current;
      const pull = 1 - Math.exp(-(now - last) / lagMs);
      last = now;
      from.x += (to.x - from.x) * pull;
      from.y += (to.y - from.y) * pull;
      if (Math.abs(to.x - from.x) + Math.abs(to.y - from.y) < SETTLED) {
        from.x = to.x;
        from.y = to.y;
        place(element, from.x, from.y);
        frame.current = null;
        return;
      }
      place(element, from.x, from.y);
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, [x, y, lagMs]);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  return ref;
}
