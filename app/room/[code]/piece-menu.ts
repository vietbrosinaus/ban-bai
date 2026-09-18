import { FlipHorizontal2, GalleryHorizontalEnd, Hand, HandGrab, Layers, RotateCw, Scissors, Shuffle, SquareStack, type LucideIcon } from "lucide-react";

import type { Command, TablePiece } from "@/lib/domain/table";

export type PieceMenuItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  gesture?: string;
  when: (piece: TablePiece) => boolean;
  command: (piece: TablePiece) => Command;
};

export const PIECE_MENU: PieceMenuItem[] = [
  { key: "shuffle", label: "Xào", icon: Shuffle, when: (p) => p.cards.length > 1, command: (p) => ({ type: "shuffle", pieceId: p.id }) },
  { key: "flipAll", label: "Lật cả chồng", icon: SquareStack, when: (p) => p.cards.length > 1, command: (p) => ({ type: "flipAll", pieceId: p.id }) },
  { key: "spread", label: "Trải ra", icon: GalleryHorizontalEnd, when: (p) => p.cards.length > 1, command: (p) => ({ type: "spread", pieceId: p.id }) },
  { key: "cut", label: "Cắt đôi", icon: Scissors, when: (p) => p.cards.length > 3, command: (p) => ({ type: "split", pieceId: p.id, count: Math.floor(p.cards.length / 2), x: Math.min(0.94, p.x + 0.09), y: p.y }) },
  { key: "flipTop", label: "Lật lá trên", icon: FlipHorizontal2, gesture: "Nháy đúp", when: (p) => p.cards.length > 0, command: (p) => ({ type: "flipTop", pieceId: p.id }) },
  { key: "rotate", label: "Xoay 90°", icon: RotateCw, gesture: "Lăn chuột", when: (p) => p.cards.length > 0, command: (p) => ({ type: "rotate", pieceId: p.id, degrees: 90 }) },
  { key: "draw1", label: "Rút 1 lá", icon: Hand, gesture: "Chuột giữa", when: (p) => p.cards.length > 0, command: (p) => ({ type: "takeToHand", pieceId: p.id, count: 1 }) },
  { key: "takeAll", label: "Cầm hết", icon: HandGrab, when: (p) => p.cards.length > 0, command: (p) => ({ type: "takeToHand", pieceId: p.id, count: p.cards.length }) },
  { key: "gather", label: "Dọn bài về chồng", icon: Layers, when: (p) => p.tag === "deck", command: () => ({ type: "gather" }) },
];
