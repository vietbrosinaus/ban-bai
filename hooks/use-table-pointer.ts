"use client";

import { type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent, useCallback, useRef, useState } from "react";

import { PRESENCE, type Anchor } from "@/lib/domain/presence";
import type { Command, TablePiece } from "@/lib/domain/table";
import type { Point, SeatSlot } from "@/lib/domain/card";

type DropTarget = { kind: "piece"; id: string } | { kind: "slot"; seatId: string; slot: SeatSlot } | { kind: "seat"; id: string } | { kind: "hand" } | { kind: "felt" } | null;

type Drag = { pieceId: string; pointerId: number; dx: number; dy: number; startX: number; startY: number; moved: boolean; peel: boolean; count: number };
type HandDrag = { cardId: string; pointerId: number; startX: number; startY: number; moved: boolean };

function hitTest(clientX: number, clientY: number, ignoreId?: string): DropTarget {
  for (const element of document.elementsFromPoint(clientX, clientY)) {
    const data = (element as HTMLElement).dataset ?? {};
    if (data.piece && data.piece !== ignoreId) return { kind: "piece", id: data.piece };
    if (data.slot && data.slotSeat) return { kind: "slot", seatId: data.slotSeat, slot: data.slot as SeatSlot };
    if (data.seat) return { kind: "seat", id: data.seat };
    if (data.handzone !== undefined) return { kind: "hand" };
    if (data.felt !== undefined) return { kind: "felt" };
  }
  return null;
}

export function useTablePointer({
  send,
  setAnchor,
  peelDefault = true,
}: {
  send: (command: Command) => Promise<unknown>;
  setAnchor: (anchor: Anchor, grabbing?: boolean) => void;
  peelDefault?: boolean;
}) {
  const feltRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const handDragRef = useRef<HandDrag | null>(null);
  const settleRef = useRef<number | null>(null);
  const [localPositions, setLocalPositions] = useState<Record<string, Point>>({});
  const [held, setHeld] = useState<string | null>(null);
  const [carrying, setCarrying] = useState<{ cardId: string; x: number; y: number } | null>(null);
  const [takeCount, setTakeCount] = useState(0);

  const toFraction = useCallback((clientX: number, clientY: number): Point => {
    const felt = feltRef.current;
    if (!felt) return { x: 0.5, y: 0.5 };
    const rect = felt.getBoundingClientRect();
    return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height };
  }, []);

  const settle = useCallback((anchor: Anchor, grabbing = false) => {
    if (settleRef.current !== null) window.clearTimeout(settleRef.current);
    settleRef.current = window.setTimeout(() => setAnchor(anchor, grabbing), PRESENCE.settleMs);
  }, [setAnchor]);

  const feltProps = {
    "data-felt": "",
    ref: feltRef,
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "touch") return;
      if (dragRef.current?.moved) return;
      const { x, y } = toFraction(event.clientX, event.clientY);
      const target = event.target instanceof Element ? event.target.closest("[data-piece]") : null;
      const pieceId = target instanceof HTMLElement ? target.dataset.piece : undefined;
      settle(pieceId ? { kind: "piece", id: pieceId } : { kind: "point", x, y });
    },
    onPointerLeave: () => {
      if (settleRef.current !== null) window.clearTimeout(settleRef.current);
      setAnchor({ kind: "home" });
    },
    onContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) event.preventDefault();
    },
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>, drop: boolean) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setHeld(null);
    setTakeCount(0);
    setAnchor({ kind: "piece", id: drag.pieceId }, false);
    if (!drop || !drag.moved) { setLocalPositions({}); return; }

    const target = hitTest(event.clientX, event.clientY, drag.pieceId);
    const { x, y } = toFraction(event.clientX, event.clientY);
    const finish = () => setLocalPositions({});

    if (target?.kind === "piece") void send({ type: "merge", pieceId: drag.pieceId, ontoId: target.id }).finally(finish);
    else if (target?.kind === "slot") void send({ type: "placeInSlot", pieceId: drag.pieceId, seatId: target.seatId, slot: target.slot }).finally(finish);
    else if (target?.kind === "hand") void send({ type: "takeToHand", pieceId: drag.pieceId, count: 99 }).finally(finish);
    else void send({ type: "move", pieceId: drag.pieceId, x: x - drag.dx, y: y - drag.dy }).finally(finish);
  };

  const pieceProps = (piece: TablePiece) => ({
    "data-piece": piece.id,
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button === 1) { event.preventDefault(); void send({ type: "flipTop", pieceId: piece.id }); return; }
      if (event.button !== 0) return;
      event.stopPropagation();
      const { x, y } = toFraction(event.clientX, event.clientY);
      const peel = peelDefault ? !event.shiftKey : event.shiftKey;
      dragRef.current = { pieceId: piece.id, pointerId: event.pointerId, dx: x - piece.x, dy: y - piece.y, startX: event.clientX, startY: event.clientY, moved: false, peel, count: 1 };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (!drag.moved) {
        if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4) return;
        drag.moved = true;
        setHeld(drag.pieceId);
        setAnchor({ kind: "piece", id: drag.pieceId }, true);
        if (drag.peel && piece.cards.length > 1) setTakeCount(drag.count);
      }
      const { x, y } = toFraction(event.clientX, event.clientY);
      setLocalPositions({ [drag.pieceId]: { x: x - drag.dx, y: y - drag.dy } });
    },
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => endDrag(event, true),
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => endDrag(event, false),
    onDoubleClick: () => void send({ type: "takeToHand", pieceId: piece.id, count: 1 }),
    onWheel: (event: ReactWheelEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (drag?.moved && drag.pieceId === piece.id && drag.peel) {
        drag.count = Math.max(1, Math.min(piece.cards.length, drag.count + (event.deltaY > 0 ? -1 : 1)));
        setTakeCount(drag.count);
        return;
      }
      void send({ type: "rotate", pieceId: piece.id, degrees: event.deltaY > 0 ? 15 : -15 });
    },
    onAuxClick: (event: ReactMouseEvent<HTMLDivElement>) => event.preventDefault(),
  });

  const endHandDrag = (event: ReactPointerEvent<HTMLDivElement>, drop: boolean) => {
    const drag = handDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    handDragRef.current = null;
    setCarrying(null);
    if (!drop || !drag.moved) return;

    const target = hitTest(event.clientX, event.clientY);
    const faceUp = event.shiftKey;
    if (target?.kind === "slot") void send({ type: "playToSlot", cardId: drag.cardId, seatId: target.seatId, slot: target.slot, faceUp: true });
    else if (target?.kind === "piece") void send({ type: "playOntoPiece", cardId: drag.cardId, pieceId: target.id, faceUp });
    else if (target?.kind === "seat") void send({ type: "giveToSeat", cardId: drag.cardId, seatId: target.id });
    else if (target?.kind === "felt") {
      const { x, y } = toFraction(event.clientX, event.clientY);
      void send({ type: "playToTable", cardId: drag.cardId, x, y, faceUp });
    }
  };

  const handCardProps = (cardId: string) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      handDragRef.current = { cardId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = handDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4) return;
      drag.moved = true;
      setCarrying({ cardId: drag.cardId, x: event.clientX, y: event.clientY });
    },
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => endHandDrag(event, true),
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => endHandDrag(event, false),
  });

  return { feltProps, feltRef, pieceProps, handCardProps, localPositions, held, carrying, takeCount };
}
