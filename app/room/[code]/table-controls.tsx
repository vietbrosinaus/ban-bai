"use client";

import { CircleDot } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Command } from "@/lib/domain/table";

export function HandUtilities({
  watching,
  send,
  seatPoint,
}: {
  watching: boolean;
  send: (command: Command) => Promise<unknown>;
  seatPoint: { x: number; y: number };
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("HP");
  const [value, setValue] = useState(4);

  if (watching) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const spot = { x: Math.min(0.94, seatPoint.x + 0.07), y: Math.min(0.94, seatPoint.y) };
    if (await send({ type: "addCounter", label, value, x: spot.x, y: spot.y })) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary"><CircleDot />Thêm đếm</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Thêm ô đếm</DialogTitle>
          <DialogDescription>Một con số có tên. Dùng cho máu, vàng, lượt, bất cứ thứ gì các bạn tự quy ước. Kéo nó vào ghế để gắn vào người.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={submit}>
          <Input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={12} placeholder="Tên" autoFocus />
          <Input type="number" value={value} onChange={(event) => setValue(Number(event.target.value) || 0)} />
          <Button type="submit">Đặt lên bàn</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
