"use client";

import { Eye, LogOut, Menu, PenLine, RefreshCw, RotateCcw, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Command } from "@/lib/domain/table";

export function TableMenu({
  isHost,
  watching,
  canDeal,
  seatId,
  send,
}: {
  isHost: boolean;
  watching: boolean;
  canDeal: boolean;
  seatId: string;
  send: (command: Command) => Promise<unknown>;
}) {
  const router = useRouter();
  const [dealOpen, setDealOpen] = useState(false);
  const [dealCount, setDealCount] = useState(4);

  async function submitDeal(event: FormEvent) {
    event.preventDefault();
    if (await send({ type: "dealToAll", count: dealCount })) setDealOpen(false);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" aria-label="Menu bàn"><Menu /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-[0.65rem]">Cả bàn</DropdownMenuLabel>
          <DropdownMenuItem disabled={watching} onSelect={() => void send({ type: "proposeClear" })}>
            <Trash2 />
            Đề nghị dọn bàn
          </DropdownMenuItem>
          {isHost ? (
            <>
              <DropdownMenuItem disabled={!canDeal} onSelect={() => setDealOpen(true)}><Users />Chia bài</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void send({ type: "compactRing" })}><RotateCcw />Xếp lại chỗ</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void send({ type: "reset" })}><RefreshCw />Ván mới</DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[0.65rem]">Chỗ của bạn</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => { window.localStorage.removeItem("ban-bai:name"); router.refresh(); }}>
            <PenLine />
            Đổi tên
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void send({ type: "leave", seatId })}>
            {watching ? <Users /> : <Eye />}
            {watching ? "Xin một ghế chơi" : "Chuyển sang xem"}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={async () => {
              await send({ type: "leave", seatId });
              router.push("/");
            }}
          >
            <LogOut />
            Rời bàn
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dealOpen} onOpenChange={setDealOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Chia bài cho mọi người</DialogTitle>
            <DialogDescription>Mỗi người chơi nhận số lá này từ chồng bài. Người đang xem không nhận bài.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={submitDeal}>
            <Input type="number" min={1} max={13} value={dealCount} onChange={(event) => setDealCount(Math.max(1, Math.min(13, Number(event.target.value) || 1)))} autoFocus />
            <Button type="submit">Chia {dealCount} lá mỗi người</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ClearVoteBanner({
  vote,
  players,
  seatId,
  seats,
  send,
}: {
  vote: { proposedBy: string; agreedBy: string[]; expiresAt: number };
  players: number;
  seatId: string;
  seats: Array<{ id: string; name: string }>;
  send: (command: Command) => Promise<unknown>;
}) {
  const needed = Math.ceil(players / 2);
  const agreed = vote.agreedBy.length;
  const mine = vote.agreedBy.includes(seatId);
  const proposer = seats.find((seat) => seat.id === vote.proposedBy)?.name ?? "ai đó";

  return (
    <div className="absolute top-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-gilt/40 bg-felt-deep/95 px-4 py-2 shadow-lg backdrop-blur">
      <Trash2 className="size-4 text-gilt" />
      <span className="text-xs">
        <b>{proposer}</b> đề nghị dọn bàn
        <span className="ml-2 text-white/50 tabular-nums">{agreed}/{needed}</span>
      </span>
      <Button size="xs" disabled={mine} onClick={() => void send({ type: "agreeClear" })}>
        {mine ? "Đã đồng ý" : "Đồng ý"}
      </Button>
      <Button size="xs" variant="ghost" onClick={() => void send({ type: "cancelClear" })}>Bỏ</Button>
    </div>
  );
}
