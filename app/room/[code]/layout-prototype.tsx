"use client";

// PROTOTYPE, throwaway: four room layouts on /room/[code]?variant=A|B|C|D, see VariantSwitcher.
import { ChevronLeft, ChevronRight, MousePointerClick, ScrollText, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { PlayingCard } from "@/components/table/playing-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { SelectionView } from "./selection-actions";

export const LAYOUT_VARIANTS = [
  { key: "A", name: "Hai bảng hai bên" },
  { key: "B", name: "Bảng nổi" },
  { key: "C", name: "Một bảng có thẻ" },
  { key: "D", name: "Thanh dưới" },
] as const;

type BodyProps = { felt: ReactNode; log: ReactNode; view: SelectionView | null; selectionKey: string };

const PANEL = "rounded-2xl border border-white/10 bg-felt-deep/40";
const SIDE_WIDTH = "w-44";

function EmptyHint({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 text-center", compact ? "py-2" : "h-full py-8")}>
      {compact ? null : <span className="aspect-[5/7] w-12 rounded-md border-2 border-dashed border-white/15 bg-white/[0.02]" />}
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
              "flex min-h-10 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[0.8rem] leading-tight transition-colors hover:bg-white/[0.07] active:bg-white/[0.12]",
              action.danger ? "text-red-300" : "text-white/85",
            )}
          >
            <action.icon className={cn("size-4 shrink-0", action.danger ? "text-red-300" : "text-gilt")} />
            {action.label}
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
    <section className={cn(PANEL, SIDE_WIDTH, "grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2 p-2.5")}>
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

function VariantA({ felt, log, view }: BodyProps) {
  const [left, setLeft] = useState(true);
  const [right, setRight] = useState(true);
  return (
    <div className="grid min-h-0 grid-cols-[auto_minmax(0,1fr)_auto] gap-3 px-3 py-3">
      <SidePanel side="left" title="Thao tác" icon={MousePointerClick} open={left} onToggle={() => setLeft(!left)}>
        {view ? <ScrollArea className="h-full [&_[data-slot=scroll-area-thumb]]:bg-white/20"><SelectionHeader view={view} /><ActionList view={view} /></ScrollArea> : <EmptyHint />}
      </SidePanel>
      {felt}
      <SidePanel side="right" title="Diễn biến" icon={ScrollText} open={right} onToggle={() => setRight(!right)}>
        {log}
      </SidePanel>
    </div>
  );
}

function VariantB({ felt, log, view }: BodyProps) {
  const [logOpen, setLogOpen] = useState(false);
  return (
    <div className="relative grid min-h-0 px-3 py-3">
      {felt}
      {view ? (
        <section data-overlay="" className={cn(PANEL, "absolute top-5 left-5 z-40 max-h-[calc(100%-2.5rem)] w-64 overflow-y-auto bg-felt-deep/95 p-3 shadow-2xl backdrop-blur")}>
          <SelectionHeader view={view} />
          <ActionList view={view} />
        </section>
      ) : (
        <div data-overlay="" className={cn(PANEL, "absolute top-5 left-5 z-40 bg-felt-deep/90 px-3 backdrop-blur")}>
          <EmptyHint compact />
        </div>
      )}
      <button
        type="button"
        data-overlay=""
        onClick={() => setLogOpen(!logOpen)}
        className={cn(PANEL, "absolute top-5 right-5 z-40 flex items-center gap-1.5 bg-felt-deep/90 px-3 py-2 text-xs text-white/70 backdrop-blur hover:text-white")}
      >
        <ScrollText className="size-4" />Diễn biến
      </button>
      {logOpen ? (
        <section data-overlay="" className={cn(PANEL, "absolute top-16 right-5 bottom-5 z-40 grid w-64 grid-rows-[auto_minmax(0,1fr)] gap-2 bg-felt-deep/95 p-3 shadow-2xl backdrop-blur")}>
          <header className="flex items-center justify-between">
            <h2 className="text-[0.6rem] tracking-wider text-white/40 uppercase">Diễn biến</h2>
            <button type="button" onClick={() => setLogOpen(false)} className="grid size-7 place-items-center rounded-md text-white/50 hover:bg-white/10" aria-label="Đóng"><X className="size-4" /></button>
          </header>
          <div className="min-h-0 overflow-hidden">{log}</div>
        </section>
      ) : null}
    </div>
  );
}

function TabbedPanel({ view, log, open, onToggle }: { view: SelectionView | null; log: ReactNode; open: boolean; onToggle: () => void }) {
  const [tab, setTab] = useState<"actions" | "log">("actions");
  if (!open) {
    return (
      <button type="button" onClick={onToggle} className={cn(PANEL, "flex w-11 flex-col items-center gap-3 py-3 text-white/60 hover:text-white")} aria-label="Mở bảng">
        <MousePointerClick className="size-4" />
        <ScrollText className="size-4" />
      </button>
    );
  }
  return (
    <section className={cn(PANEL, "grid min-h-0 w-64 grid-rows-[auto_minmax(0,1fr)] gap-2 p-3")}>
      <header className="flex items-center gap-1">
        {(["actions", "log"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold", tab === key ? "bg-white/10 text-white" : "text-white/45 hover:text-white/80")}
          >
            {key === "actions" ? <MousePointerClick className="size-3.5" /> : <ScrollText className="size-3.5" />}
            {key === "actions" ? "Thao tác" : "Diễn biến"}
          </button>
        ))}
        <button type="button" onClick={onToggle} className="grid size-8 place-items-center rounded-md text-white/50 hover:bg-white/10" aria-label="Thu bảng"><ChevronLeft className="size-4" /></button>
      </header>
      <div className="min-h-0 overflow-hidden">
        {tab === "log" ? log : view ? <div className="h-full overflow-y-auto"><SelectionHeader view={view} /><ActionList view={view} /></div> : <EmptyHint />}
      </div>
    </section>
  );
}

function VariantC({ felt, log, view, selectionKey }: BodyProps) {
  const [open, setOpen] = useState(true);
  return (
    <div className="grid min-h-0 grid-cols-[auto_minmax(0,1fr)] gap-3 px-3 py-3">
      <TabbedPanel key={selectionKey} view={view} log={log} open={open} onToggle={() => setOpen(!open)} />
      {felt}
    </div>
  );
}

function VariantD({ felt, log, view }: BodyProps) {
  const [right, setRight] = useState(true);
  return (
    <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-3">
      <div className="relative grid min-h-0">
        {felt}
        <div data-overlay="" className="pointer-events-none absolute inset-x-0 bottom-2 z-40 flex justify-center px-2">
          {view ? (
            <section className={cn(PANEL, "pointer-events-auto flex max-w-full items-center gap-2 overflow-x-auto bg-felt-deep/95 p-1.5 shadow-2xl backdrop-blur")}>
              <div className="flex shrink-0 items-center gap-2 border-r border-white/10 pr-2 pl-1">
                {view.cardId ? <PlayingCard cardId={view.cardId} size="xs" className="w-7" /> : null}
                <b className="max-w-[8rem] truncate text-xs font-semibold text-[#f2ede0]">{view.title}</b>
              </div>
              {view.actions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={action.run}
                  className={cn("flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-medium whitespace-nowrap hover:bg-white/10 active:bg-white/15", action.danger ? "text-red-300" : "text-white/85")}
                >
                  <action.icon className={cn("size-4", action.danger ? "text-red-300" : "text-gilt")} />
                  {action.label}
                </button>
              ))}
            </section>
          ) : (
            <span className="rounded-full bg-felt-deep/80 px-3 py-1.5 text-[0.7rem] text-white/50 backdrop-blur">Chạm vào một lá bài, chồng bài hoặc ô đếm để xem thao tác.</span>
          )}
        </div>
      </div>
      <SidePanel side="right" title="Diễn biến" icon={ScrollText} open={right} onToggle={() => setRight(!right)}>
        {log}
      </SidePanel>
    </div>
  );
}

export function RoomBodyPrototype({ variant, ...props }: BodyProps & { variant: string }) {
  if (variant === "B") return <VariantB {...props} />;
  if (variant === "C") return <VariantC {...props} />;
  if (variant === "D") return <VariantD {...props} />;
  return <VariantA {...props} />;
}
