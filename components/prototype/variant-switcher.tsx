"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const SHOWN = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";

type Variant = { key: string; name: string };

function VariantSwitcher({ variants }: { variants: readonly Variant[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("variant") ?? variants[0].key;
  const index = Math.max(0, variants.findIndex((variant) => variant.key === current));

  const go = (step: number) => {
    const next = variants[(index + step + variants.length) % variants.length];
    const query = new URLSearchParams(params.toString());
    query.set("variant", next.key);
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable=true]")) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!SHOWN) return null;
  return (
    <div data-overlay="" className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-1 rounded-full bg-fuchsia-600 p-1 text-white shadow-[0_0.5rem_1.5rem_rgba(0,0,0,0.45)]">
      <button type="button" onClick={() => go(-1)} className="grid size-8 place-items-center rounded-full hover:bg-white/20" aria-label="Previous variant">
        <ChevronLeft className="size-4" />
      </button>
      <span className="px-2 text-xs font-bold whitespace-nowrap">
        PROTOTYPE {variants[index].key}: {variants[index].name}
      </span>
      <button type="button" onClick={() => go(1)} className="grid size-8 place-items-center rounded-full hover:bg-white/20" aria-label="Next variant">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

export { VariantSwitcher };
