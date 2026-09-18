"use client";

import * as React from "react";
import {
  BookOpenText,
  CircleDot,
  CircleHelp,
  Crown,
  EyeOff,
  Eye,
  FlipHorizontal2,
  Gift,
  Hand,
  HandGrab,
  Layers,
  MousePointer2,
  Radar,
  Move,
  RotateCw,
  Scissors,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHydrated, useStoredValue } from "@/hooks/use-hydrated";

const SEEN_KEY = "ban-bai:seen-how-to-play";

type Gesture = { icon: LucideIcon; action: string; how: string[] };
type Section = { title: string; moves: Gesture[] };

const SECTIONS: Section[] = [
  {
    title: "Rút bài",
    moves: [
      { icon: Hand, action: "Rút 1 lá", how: ["Nháy đúp vào chồng bài"] },
      { icon: HandGrab, action: "Cầm cả chồng", how: ["Kéo chồng bài xuống khay tay"] },
      { icon: Scissors, action: "Tách vài lá ra", how: ["Shift", "kéo chồng bài", "lăn chuột chọn số lá"] },
    ],
  },
  {
    title: "Đánh bài từ tay",
    moves: [
      { icon: EyeOff, action: "Đánh úp", how: ["Kéo lá lên bàn"] },
      { icon: Eye, action: "Đánh ngửa", how: ["Giữ Shift", "khi thả"] },
      { icon: Crown, action: "Đặt tướng, vũ khí, ngựa", how: ["Kéo vào ô trống của một người"] },
      { icon: Gift, action: "Đưa bài cho người khác", how: ["Kéo lá vào bảng tên của họ"] },
    ],
  },
  {
    title: "Trên bàn",
    moves: [
      { icon: Move, action: "Di chuyển", how: ["Kéo"] },
      { icon: Layers, action: "Gộp hai chồng", how: ["Thả chồng này lên chồng kia"] },
      { icon: FlipHorizontal2, action: "Lật lá trên cùng", how: ["Chuột giữa"] },
      { icon: RotateCw, action: "Xoay", how: ["Lăn chuột"] },
      { icon: MousePointer2, action: "Xào, trải, cắt đôi, úp hoặc ngửa cả chồng", how: ["Chuột phải"] },
      { icon: BookOpenText, action: "Xem luật một lá", how: ["Nháy chuột vào lá đang ngửa"] },
      { icon: Radar, action: "Chỉ cho cả bàn xem", how: ["Nháy đúp vào chỗ trống trên bàn"] },
    ],
  },
  {
    title: "Ô đếm máu và điểm",
    moves: [
      { icon: CircleDot, action: "Cộng 1, tăng giảm, di chuyển", how: ["Nháy chuột", "lăn chuột", "kéo"] },
    ],
  },
];

function MoveRow({ icon: Icon, action, how }: Gesture) {
  return (
    <li className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-3 py-2">
      <span className="grid size-7 place-items-center rounded-lg bg-felt text-gilt">
        <Icon className="size-4" />
      </span>
      <div className="grid gap-1.5">
        <b className="text-sm font-semibold text-foreground">{action}</b>
        <span className="flex flex-wrap items-center gap-1.5">
          {how.map((step) => <Kbd key={step}>{step}</Kbd>)}
        </span>
      </div>
    </li>
  );
}

function HowToPlay() {
  const ready = useHydrated();
  const seen = useStoredValue(SEEN_KEY);
  const [asked, setAsked] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const open = ready && (asked || (!seen && !dismissed));

  function onOpenChange(next: boolean) {
    if (next) {
      setAsked(true);
      return;
    }
    setAsked(false);
    setDismissed(true);
    window.localStorage.setItem(SEEN_KEY, "1");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Cách chơi">
          <CircleHelp />
          Cách chơi
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Cách chơi</DialogTitle>
          <DialogDescription>
            Bàn này không bắt luật. Nó chỉ di chuyển bài, cả bàn tự giữ luật với nhau như ngồi chơi thật.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="-mr-4 pr-4 [&_[data-slot=scroll-area-viewport]]:max-h-[calc(85svh-10rem)]">
        <div className="grid gap-4">
          {SECTIONS.map((section) => (
            <section key={section.title} className="grid gap-0.5">
              <h3 className="text-[0.7rem] font-bold tracking-wider text-muted-foreground uppercase">{section.title}</h3>
              <ul className="divide-y divide-border">
                {section.moves.map((move) => <MoveRow key={move.action} {...move} />)}
              </ul>
            </section>
          ))}
        </div>
        <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Dùng chuột trên máy tính. Mở lại bảng này bất cứ lúc nào bằng nút Cách chơi ở góc trên.
        </p>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export { HowToPlay };
