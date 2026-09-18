"use client";

import { GalleryHorizontalEnd, HandGrab, Layers, SquareStack, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Command } from "@/lib/domain/table";

export function SelectionBar({
  selection,
  discardId,
  watching,
  onClear,
  send,
}: {
  selection: string[];
  discardId?: string;
  watching: boolean;
  onClear: () => void;
  send: (command: Command) => Promise<unknown>;
}) {
  if (selection.length < 1) return null;

  async function run(command: Command) {
    if (await send(command)) onClear();
  }

  return (
    <div className="absolute bottom-3 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-1.5 rounded-full border border-gilt/40 bg-felt-deep/95 px-3 py-2 shadow-lg backdrop-blur">
      <Badge variant="secondary" className="tabular-nums">{selection.length} lá</Badge>
      {watching ? (
        <span className="px-1 text-xs text-white/50">ghế xem không thao tác được</span>
      ) : (
        <>
          <Button size="xs" variant="ghost" disabled={selection.length < 2} onClick={() => void run({ type: "selectionStack", ids: selection })}>
            <Layers />Gom lại
          </Button>
          <Button size="xs" variant="ghost" onClick={() => void run({ type: "selectionSpread", ids: selection })}>
            <GalleryHorizontalEnd />Trải ra
          </Button>
          <Button size="xs" variant="ghost" onClick={() => void run({ type: "selectionFlip", ids: selection })}>
            <SquareStack />Lật
          </Button>
          <Button size="xs" variant="ghost" onClick={() => void run({ type: "selectionToHand", ids: selection })}>
            <HandGrab />Cầm hết
          </Button>
          {discardId ? (
            <Button size="xs" variant="ghost" onClick={() => void run({ type: "selectionToPile", ids: selection, pileId: discardId })}>
              <Trash2 />Bỏ
            </Button>
          ) : null}
        </>
      )}
      <Button size="icon-xs" variant="ghost" aria-label="Bỏ chọn" onClick={onClear}><X /></Button>
    </div>
  );
}
