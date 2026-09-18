"use client";

import { ChevronDown, GalleryHorizontalEnd, HandGrab, Layers, SquareStack, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Command } from "@/lib/domain/table";

export function SelectionMenu({
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
  if (!selection.length) return null;

  async function run(command: Command) {
    if (await send(command)) onClear();
  }

  return (
    <div data-overlay="" className="absolute bottom-3 left-1/2 z-40 -translate-x-1/2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="rounded-full shadow-lg">
            <Layers />
            {selection.length} lá đã chọn
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top" className="w-48">
          <DropdownMenuLabel className="text-[0.65rem]">Làm gì với {selection.length} lá</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {watching ? (
            <DropdownMenuItem disabled>Ghế xem không thao tác được</DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem disabled={selection.length < 2} onSelect={() => void run({ type: "selectionStack", ids: selection })}>
                <Layers />Gom lại
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void run({ type: "selectionSpread", ids: selection })}>
                <GalleryHorizontalEnd />Trải ra
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void run({ type: "selectionFlip", ids: selection })}>
                <SquareStack />Lật
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void run({ type: "selectionToHand", ids: selection })}>
                <HandGrab />Cầm hết
              </DropdownMenuItem>
              {discardId ? (
                <DropdownMenuItem onSelect={() => void run({ type: "selectionToPile", ids: selection, pileId: discardId })}>
                  <Trash2 />Bỏ vào chồng bài bỏ
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onSelect={onClear}><X />Bỏ chọn</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
