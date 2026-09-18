"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { MetaList } from "@/components/ui/meta-list";

export function PrototypeSwitcher({ variants, names, current }: { variants: string[]; names: Record<string, string>; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const go = (delta: number) => {
    const index = variants.indexOf(current);
    const next = variants[(index + delta + variants.length) % variants.length];
    router.replace(`${pathname}?variant=${next}`);
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  if (process.env.NODE_ENV === "production") return null;
  return (
    <div className="proto-switcher" onPointerDown={(e) => e.stopPropagation()} onContextMenu={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="icon-sm" onClick={() => go(-1)} aria-label="Previous variant"><ChevronLeft /></Button>
      <MetaList className="px-2"><span>{current}</span><span>{names[current]}</span></MetaList>
      <Button variant="ghost" size="icon-sm" onClick={() => go(1)} aria-label="Next variant"><ChevronRight /></Button>
    </div>
  );
}
