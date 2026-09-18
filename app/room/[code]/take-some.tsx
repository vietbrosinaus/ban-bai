"use client";

import { Minus, Plus, WalletCards } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { pieceLabel, type Command, type TablePiece } from "@/lib/domain/table";

const DEFAULT_TAKE = 7;

function TakeSome({
  piece,
  onClose,
  send,
}: {
  piece: TablePiece;
  onClose: () => void;
  send: (command: Command) => Promise<unknown>;
}) {
  const most = piece.cards.length;
  const [count, setCount] = useState(Math.min(DEFAULT_TAKE, most));
  const clamp = (value: number) => Math.max(1, Math.min(most, Math.round(value) || 1));

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Rút nhiều lá</DialogTitle>
          <DialogDescription>
            Từ {pieceLabel(piece)}, còn {most} lá.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await send({ type: "takeToHand", pieceId: piece.id, count })) onClose();
          }}
        >
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" aria-label="Bớt một lá" disabled={count <= 1} onClick={() => setCount(clamp(count - 1))}>
              <Minus />
            </Button>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={most}
              value={count}
              onChange={(event) => setCount(clamp(Number(event.target.value)))}
              aria-label="Số lá"
              className="text-center text-lg font-semibold tabular-nums"
              autoFocus
            />
            <Button type="button" variant="outline" size="icon" aria-label="Thêm một lá" disabled={count >= most} onClick={() => setCount(clamp(count + 1))}>
              <Plus />
            </Button>
          </div>
          <Button type="submit">
            <WalletCards />
            Rút {count} lá
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { TakeSome };
