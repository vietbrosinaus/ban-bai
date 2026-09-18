import { deckOf, type DeckKind } from "./deck";
import type { CommandContext, TablePiece, TableState } from "./table";

export const STARTER = {
  generals: { x: 0.34, y: 0.5, label: "Chồng tướng" },
  deck: { x: 0.64, y: 0.42, label: "Chồng bài" },
  discard: { x: 0.64, y: 0.68, label: "Chồng bài bỏ" },
} as const;

export type TableDeck = Extract<DeckKind, "tam-quoc-sat" | "classic-52">;

export function starterPieces(ctx: Pick<CommandContext, "shuffle">, deck: TableDeck = "tam-quoc-sat"): TablePiece[] {
  const generals: TablePiece[] = deck === "tam-quoc-sat" ? [{
    id: "generals",
    tag: "generals",
    label: STARTER.generals.label,
    x: STARTER.generals.x,
    y: STARTER.generals.y,
    rotation: 0,
    cards: ctx.shuffle(deckOf("generals")).map((id) => ({ id, faceUp: false })),
  }] : [];

  return [
    ...generals,
    {
      id: "deck",
      tag: "deck",
      label: STARTER.deck.label,
      x: STARTER.deck.x,
      y: STARTER.deck.y,
      rotation: 0,
      cards: ctx.shuffle(deckOf(deck)).map((id) => ({ id, faceUp: false })),
    },
    {
      id: "discard",
      tag: "discard",
      label: STARTER.discard.label,
      x: STARTER.discard.x,
      y: STARTER.discard.y,
      rotation: 0,
      cards: [],
    },
  ];
}

export function newTable(code: string, hostId: string, ctx: Pick<CommandContext, "shuffle">, deck: TableDeck = "tam-quoc-sat"): TableState {
  return {
    code,
    hostId,
    deck,
    ringSize: 1,
    seats: [],
    pieces: starterPieces(ctx, deck),
    hands: {},
    counters: [],
    clearVote: undefined,
    revision: 1,
    log: [{ id: 1, actorId: "table", text: deck === "tam-quoc-sat" ? "Chồng tướng và chồng bài đã sẵn sàng" : "Bộ bài đã sẵn sàng" }],
  };
}
