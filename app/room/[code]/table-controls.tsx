"use client";

import { CircleDot, Layers, RefreshCw, RotateCcw, Users } from "lucide-react";
import { type FormEvent, useState } from "react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Command } from "@/lib/domain/table";

export function TableControls({
  isHost,
  watching,
  canDeal,
  send,
  seatPoint,
}: {
  isHost: boolean;
  watching: boolean;
  canDeal: boolean;
  send: (command: Command) => Promise<unknown>;
  seatPoint: { x: number; y: number };
}) {
  const [dealOpen, setDealOpen] = useState(false);
  const [dealCount, setDealCount] = useState(4);
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterLabel, setCounterLabel] = useState("HP");
  const [counterValue, setCounterValue] = useState(4);

  if (watching) return null;

  async function submitDeal(event: FormEvent) {
    event.preventDefault();
    if (await send({ type: "dealToAll", count: dealCount })) setDealOpen(false);
  }

  async function submitCounter(event: FormEvent) {
    event.preventDefault();
    const spot = { x: Math.min(0.94, seatPoint.x + 0.06), y: Math.min(0.94, seatPoint.y) };
    if (await send({ type: "addCounter", label: counterLabel, value: counterValue, x: spot.x, y: spot.y })) setCounterOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Dialog open={counterOpen} onOpenChange={setCounterOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="secondary" ><CircleDot />Thêm đếm</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Thêm ô đếm</DialogTitle>
            <DialogDescription>Một con số có tên. Dùng cho máu, vàng, lượt, bất cứ thứ gì các bạn tự quy ước.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={submitCounter}>
            <Input value={counterLabel} onChange={(event) => setCounterLabel(event.target.value)} maxLength={12} placeholder="Tên" autoFocus />
            <Input type="number" value={counterValue} onChange={(event) => setCounterValue(Number(event.target.value) || 0)} />
            <Button type="submit">Đặt lên bàn</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Button size="sm" variant="secondary" onClick={() => void send({ type: "gather" })}><Layers />Dọn bài</Button>

      {isHost && (
        <Dialog open={dealOpen} onOpenChange={setDealOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="secondary" disabled={!canDeal}><Users />Chia bài</Button>
          </DialogTrigger>
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
      )}

      {isHost && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" ><RotateCcw />Xếp lại chỗ</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xếp lại chỗ ngồi?</AlertDialogTitle>
              <AlertDialogDescription>Số ghế sẽ được đánh lại từ 1 theo thứ tự hiện tại. Làm việc này giữa ván sẽ đổi thứ tự vòng và khoảng cách.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Thôi</AlertDialogCancel>
              <AlertDialogAction onClick={() => void send({ type: "compactRing" })}>Xếp lại</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isHost && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" ><RefreshCw />Ván mới</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Bắt đầu ván mới?</AlertDialogTitle>
              <AlertDialogDescription>Mọi lá bài trên bàn và trên tay sẽ về chồng bài, các ô đếm bị xoá, và chỗ ngồi được xếp lại. Không hoàn tác được.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Thôi</AlertDialogCancel>
              <AlertDialogAction onClick={() => void send({ type: "reset" })}>Ván mới</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
