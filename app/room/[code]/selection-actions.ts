import { createContext } from "react";
import { Armchair, BookOpenText, Eye, EyeOff, Gift, Layers, Minus, PenLine, Plus, Trash2, Undo2, type LucideIcon } from "lucide-react";

import { SUIT_SYMBOL, type Point } from "@/lib/domain/card";
import { cardFace } from "@/lib/domain/deck";
import type { TableSnapshot } from "@/lib/domain/protocol";
import { cardKind, pieceLabel, type Command } from "@/lib/domain/table";
import { PIECE_MENU } from "./piece-menu";

export type Selected = { kind: "piece"; id: string } | { kind: "hand"; cardId: string } | { kind: "counter"; id: string } | null;

export const SelectionContext = createContext<{ selected: Selected; select: (next: Selected) => void }>({ selected: null, select: () => undefined });

export type EntityAction = { key: string; label: string; icon: LucideIcon; run: () => void; hint?: string; danger?: boolean };

export type SelectionView = { title: string; detail: string; cardId?: string; actions: EntityAction[] };

const SPREAD = 0.05;

export function describeSelection({
  selected,
  table,
  seatId,
  home,
  send,
  openInfo,
  openTakeSome,
  openRename,
  clear,
}: {
  selected: Selected;
  table: TableSnapshot | null;
  seatId: string;
  home: Point;
  send: (command: Command) => unknown;
  openInfo: (cardId: string) => void;
  openTakeSome: (pieceId: string) => void;
  openRename: (counterId: string) => void;
  clear: () => void;
}): SelectionView | null {
  if (!selected || !table) return null;

  if (selected.kind === "piece") {
    const piece = table.pieces.find((item) => item.id === selected.id);
    const top = piece?.cards.at(-1);
    if (!piece || !top) return null;
    const owner = piece.slot ? table.seats.find((seat) => seat.id === piece.ownerId)?.name : undefined;
    const single = piece.cards.length === 1 && !piece.tag;
    const actions: EntityAction[] = [];
    if (top.faceUp) actions.push({ key: "info", label: "Xem luật", icon: BookOpenText, run: () => openInfo(top.id) });
    for (const item of PIECE_MENU.filter((entry) => entry.when(piece))) {
      actions.push({
        key: item.key,
        label: item.label,
        icon: item.icon,
        hint: item.gesture,
        run: () => ("asks" in item ? openTakeSome(piece.id) : void send(item.command(piece))),
      });
    }
    return {
      title: single && top.faceUp ? cardFace(top.id)?.name ?? "Lá bài" : pieceLabel(piece),
      detail: [`${piece.cards.length} lá`, top.faceUp ? "lá trên ngửa" : "lá trên úp", owner ? `trong ô của ${owner}` : null].filter(Boolean).join(" · "),
      cardId: top.faceUp ? top.id : undefined,
      actions,
    };
  }

  if (selected.kind === "hand") {
    if (!table.hand.some((card) => card.id === selected.cardId)) return null;
    const cardId = selected.cardId;
    const face = cardFace(cardId);
    const general = cardKind(cardId) === "general";
    const play = (faceUp: boolean) => {
      const x = home.x + (Math.random() - 0.5) * SPREAD;
      const y = home.y + (Math.random() - 0.5) * SPREAD;
      void send({ type: "playToTable", cardId, x, y, faceUp });
      clear();
    };
    const actions: EntityAction[] = [
      { key: "info", label: "Xem luật", icon: BookOpenText, run: () => openInfo(cardId) },
      { key: "down", label: "Đánh úp ra bàn", icon: EyeOff, hint: "Kéo lên bàn", run: () => play(false) },
      { key: "up", label: "Đánh ngửa ra bàn", icon: Eye, hint: "Kéo bằng chuột phải", run: () => play(true) },
      general
        ? { key: "home", label: "Trả về chồng tướng", icon: Undo2, hint: "Kéo vào chồng tướng", run: () => { void send({ type: "playOntoPiece", cardId, pieceId: "generals", faceUp: false }); clear(); } }
        : { key: "discard", label: "Bỏ vào chồng bài bỏ", icon: Layers, hint: "Kéo vào chồng bài bỏ", run: () => { void send({ type: "playOntoPiece", cardId, pieceId: "discard", faceUp: true }); clear(); } },
      ...table.seats
        .filter((seat) => seat.role === "player" && seat.id !== seatId)
        .map((seat) => ({ key: `give:${seat.id}`, label: `Đưa cho ${seat.name}`, icon: Gift, hint: "Kéo vào bảng tên", run: () => { void send({ type: "giveToSeat", cardId, seatId: seat.id }); clear(); } })),
    ];
    return {
      title: face?.name ?? "Lá bài",
      detail: general ? "Tướng, trên tay bạn" : face?.kind === "play" && face.suit ? `${face.rank}${SUIT_SYMBOL[face.suit]}, trên tay bạn` : "Trên tay bạn",
      cardId,
      actions,
    };
  }

  const counter = table.counters.find((item) => item.id === selected.id);
  if (!counter) return null;
  const owner = counter.slotted ? table.seats.find((seat) => seat.id === counter.ownerId)?.name : undefined;
  const players = table.seats.filter((seat) => seat.role === "player");
  return {
    title: counter.label || "Ô đếm",
    detail: [`Giá trị ${counter.value}`, owner ? `trên ghế ${owner}` : null].filter(Boolean).join(" · "),
    actions: [
      { key: "plus", label: "Tăng 1", icon: Plus, hint: "Lăn chuột lên", run: () => void send({ type: "adjustCounter", counterId: counter.id, delta: 1 }) },
      { key: "minus", label: "Giảm 1", icon: Minus, hint: "Lăn chuột xuống", run: () => void send({ type: "adjustCounter", counterId: counter.id, delta: -1 }) },
      { key: "rename", label: "Đổi tên", icon: PenLine, run: () => openRename(counter.id) },
      ...players.map((seat) => ({
        key: `seat:${seat.id}`,
        label: `Gắn vào ghế ${seat.id === seatId ? `${seat.name} (bạn)` : seat.name}`,
        icon: Armchair,
        hint: "Kéo vào ghế",
        run: () => void send({ type: "slotCounter", counterId: counter.id, seatId: seat.id }),
      })),
      { key: "remove", label: "Bỏ đi", icon: Trash2, danger: true, run: () => { void send({ type: "removeCounter", counterId: counter.id }); clear(); } },
    ],
  };
}
