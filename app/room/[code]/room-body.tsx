"use client";

import { ChevronLeft, ChevronRight, MousePointerClick, ScrollText } from "lucide-react";
import { useState, type ReactNode } from "react";

import { PlayingCard } from "@/components/table/playing-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { SelectionView } from "./selection-actions";

const PANEL = "rounded-2xl border border-white/10 bg-felt-deep/40";

function EmptyHint() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-center">
      <span className="aspect-[5/7] w-12 rounded-md border-2 border-dashed border-white/15 bg-white/[0.02]" />
      <p className="max-w-[10rem] text-[0.7rem] leading-relaxed text-white/45">Chạm vào một lá bài, chồng bài hoặc ô đếm để xem thao tác.</p>
    </div>
  );
}

function SelectionHeader({ view }: { view: SelectionView }) {
  return (
    <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
      {view.cardId ? <PlayingCard cardId={view.cardId} size="xs" /> : null}
      <div className="min-w-0">
        <b className="block truncate text-sm font-semibold text-[#f2ede0]">{view.title}</b>
        <span className="block text-[0.7rem] text-white/50">{view.detail}</span>
      </div>
    </div>
  );
}

function ActionList({ view }: { view: SelectionView }) {
  return (
    <ul className="grid gap-0.5 pt-2">
      {view.actions.map((action) => (
        <li key={action.key}>
          <button
            type="button"
            onClick={action.run}
            className={cn(
              "flex min-h-10 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs leading-tight transition-colors hover:bg-white/[0.07] active:bg-white/[0.12]",
              action.danger ? "text-red-300" : "text-white/85",
            )}
          >
            <action.icon className={cn("size-4 shrink-0", action.danger ? "text-red-300" : "text-gilt")} />
            <span className="grid min-w-0">
              <span>{action.label}</span>
              {action.hint ? <span className="text-[0.6rem] text-white/35">{action.hint}</span> : null}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function SidePanel({ side, title, icon: Icon, open, onToggle, children }: { side: "left" | "right"; title: string; icon: typeof ScrollText; open: boolean; onToggle: () => void; children: ReactNode }) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={cn(PANEL, "flex w-11 flex-col items-center gap-3 py-3 text-white/60 hover:text-white")}
        aria-label={`Mở ${title}`}
      >
        <Icon className="size-4" />
        <span className="text-[0.65rem] font-semibold tracking-wider uppercase [writing-mode:vertical-rl]">{title}</span>
      </button>
    );
  }
  return (
    <section className={cn(PANEL, "grid min-h-0 w-44 grid-rows-[auto_minmax(0,1fr)] gap-2 p-2.5")}>
      <header className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[0.6rem] tracking-wider text-white/40 uppercase"><Icon className="size-3.5" />{title}</h2>
        <button type="button" onClick={onToggle} className="grid size-7 place-items-center rounded-md text-white/50 hover:bg-white/10 hover:text-white" aria-label={`Thu ${title}`}>
          {side === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
      </header>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </section>
  );
}

function RoomBody({ felt, log, view }: { felt: ReactNode; log: ReactNode; view: SelectionView | null }) {
  const [actionsOpen, setActionsOpen] = useState(true);
  const [logOpen, setLogOpen] = useState(true);
  return (
    <div className="grid min-h-0 grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[minmax(0,1fr)] gap-3 px-3 py-3">
      <SidePanel side="left" title="Thao tác" icon={MousePointerClick} open={actionsOpen} onToggle={() => setActionsOpen(!actionsOpen)}>
        {view ? (
          <ScrollArea type="auto" className="h-full [&_[data-slot=scroll-area-thumb]]:bg-white/20">
            <SelectionHeader view={view} />
            <ActionList view={view} />
          </ScrollArea>
        ) : (
          <EmptyHint />
        )}
      </SidePanel>
      {felt}
      <SidePanel side="right" title="Diễn biến" icon={ScrollText} open={logOpen} onToggle={() => setLogOpen(!logOpen)}>
        {log}
      </SidePanel>
    </div>
  );
}

export { RoomBody };
