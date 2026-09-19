"use client";

import { useSyncExternalStore } from "react";

import { PlayerCursor } from "@/components/table/player-cursor";
import type { HandsStore } from "@/hooks/use-table";
import type { Point } from "@/lib/domain/card";
import { placeHands } from "@/lib/domain/presence";

function RemoteHands({
  store,
  seats,
  seatPoints,
  seatId,
  now,
}: {
  store: HandsStore;
  seats: ReadonlyArray<{ id: string; name: string; colour: string }>;
  seatPoints: ReadonlyMap<string, Point>;
  seatId: string;
  now: number;
}) {
  const hands = useSyncExternalStore(store.subscribe, store.get, store.get);
  const layout = { seat: (id: string) => seatPoints.get(id), fallback: { x: 0.5, y: 0.5 } };
  return placeHands(hands, layout, now)
    .filter((hand) => hand.seatId !== seatId)
    .map((hand) => {
      const seat = seats.find((item) => item.id === hand.seatId);
      return seat ? (
        <PlayerCursor key={hand.seatId} x={hand.x} y={hand.y} colour={seat.colour} name={seat.name} grabbing={hand.grabbing} style={{ opacity: hand.opacity }} />
      ) : null;
    });
}

export { RemoteHands };
