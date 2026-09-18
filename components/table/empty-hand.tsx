import * as React from "react";

import { cn } from "@/lib/utils";

const OUTLINE_ANGLES = [-10, 0, 10];

function EmptyHand({ dropping, watching }: { dropping: boolean; watching: boolean }) {
  if (watching) return <p className="text-xs text-white/40">Người xem không cầm bài</p>;
  return (
    <div data-slot="empty-hand" className="flex flex-col items-center gap-3">
      <div className="flex">
        {OUTLINE_ANGLES.map((angle) => (
          <span
            key={angle}
            className={cn(
              "-mx-2 aspect-[5/7] w-11 rounded-md border-2 border-dashed transition-colors duration-200",
              dropping ? "border-gilt bg-gilt/10" : "border-white/15 bg-white/[0.02]",
            )}
            style={{ rotate: `${angle}deg`, translate: angle === 0 ? "0 -0.25rem" : undefined }}
          />
        ))}
      </div>
      <p className={cn("text-center text-xs transition-colors duration-200", dropping ? "font-semibold text-gilt" : "text-white/45")}>
        {dropping ? "Thả để cầm vào tay" : "Nháy đúp một chồng bài để rút, hoặc kéo bài từ bàn vào đây"}
      </p>
    </div>
  );
}

export { EmptyHand };
