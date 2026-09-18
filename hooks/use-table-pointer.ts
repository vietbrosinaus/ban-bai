"use client";

import { type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent, useCallback, useRef, useState } from "react";

import { PRESENCE, type Anchor } from "@/lib/domain/presence";
import type { Command, TablePiece } from "@/lib/domain/table";
import type { Point, SeatSlot } from "@/lib/domain/card";

type DropTarget = { kind: "piece"; id: string } | { kind: "slot"; seatId: string; slot: SeatSlot } | { kind: "seat"; id: string } | { kind: "hand" } | { kind: "felt" } | null;

type Drag = { pieceId: string; pointerId: number; dx: number; dy: number; startX: number; startY: number; moved: boolean; peel: boolean; count: number };
type CounterDrag = { counterId: string; pointerId: number; dx: number; dy: number; startX: number; startY: number; moved: boolean };
type HandDrag = { cardId: string; pointerId: number; startX: number; startY: number; moved: boolean };
type Marquee = { pointerId: number; from: Point; to: Point };

function hitTest(clientX: number, clientY: number, ignoreId?: string): DropTarget {
  for (const element of document.elementsFromPoint(clientX, clientY)) {
    const data = (element as HTMLElement).dataset ?? {};
    if (data.piece && data.piece !== ignoreId && data.slotted === undefined) return { kind: "piece", id: data.piece };
    if (data.counterZone !== undefined && data.slotSeat) return { kind: "seat", id: data.slotSeat };
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
  const counterDragRef = useRef<CounterDrag | null>(null);
  const settleRef = useRef<number | null>(null);
  const [localPositions, setLocalPositions] = useState<Record<string, Point>>({});
  const [held, setHeld] = useState<string | null>(null);
  const [carrying, setCarrying] = useState<{ cardId: string; x: number; y: number } | null>(null);
  const [takeCount, setTakeCount] = useState(0);
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [hoverTarget, setHoverTarget] = useState<DropTarget>(null);
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const marqueeRef = useRef<Marquee | null>(null);

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
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement;
      if (target.closest("[data-piece],[data-seat],[data-slot-seat],[data-slot=counter-chip],[data-overlay]")) return;
      const from = toFraction(event.clientX, event.clientY);
      marqueeRef.current = { pointerId: event.pointerId, from, to: from };
      setMarquee(marqueeRef.current);
      setSelection([]);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => {
      const box = marqueeRef.current;
      marqueeRef.current = null;
      setMarquee(null);
      if (!box || box.pointerId !== event.pointerId) return;
      const to = toFraction(event.clientX, event.clientY);
      if (Math.abs(to.x - box.from.x) < 0.01 && Math.abs(to.y - box.from.y) < 0.01) return;
      setSelection(pickInside({ ...box, to }));
    },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      const box = marqueeRef.current;
      if (box && box.pointerId === event.pointerId) {
        const to = toFraction(event.clientX, event.clientY);
        marqueeRef.current = { ...box, to };
        setMarquee(marqueeRef.current);
        return;
      }
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
    setTakeCount(0);
    setAnchor({ kind: "piece", id: drag.pieceId }, false);
    setDragCardId(null);
    setHoverTarget(null);
    if (!drop || !drag.moved) { setHeld(null); setLocalPositions({}); return; }

    const target = hitTest(event.clientX, event.clientY, drag.pieceId);
    const { x, y } = toFraction(event.clientX, event.clientY);
    const finish = () => { setHeld(null); setLocalPositions({}); };

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
      const box = event.currentTarget.getBoundingClientRect();
      const origin = toFraction(box.left + box.width / 2, box.top + box.height / 2);
      const peel = peelDefault ? !event.shiftKey : event.shiftKey;
      dragRef.current = { pieceId: piece.id, pointerId: event.pointerId, dx: x - origin.x, dy: y - origin.y, startX: event.clientX, startY: event.clientY, moved: false, peel, count: 1 };
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
        setDragCardId(piece.cards[piece.cards.length - 1]?.id ?? null);
        if (drag.peel && piece.cards.length > 1) setTakeCount(drag.count);
      }
      setHoverTarget(hitTest(event.clientX, event.clientY, drag.pieceId));
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
    setDragCardId(null);
    setHoverTarget(null);
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
      setDragCardId(drag.cardId);
      setHoverTarget(hitTest(event.clientX, event.clientY));
      setCarrying({ cardId: drag.cardId, x: event.clientX, y: event.clientY });
    },
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => endHandDrag(event, true),
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => endHandDrag(event, false),
  });

  const endCounterDrag = (event: ReactPointerEvent<HTMLDivElement>, drop: boolean) => {
    const drag = counterDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    counterDragRef.current = null;
    if (!drop || !drag.moved) { setHeld(null); setLocalPositions({}); return; }

    const target = hitTest(event.clientX, event.clientY);
    const { x, y } = toFraction(event.clientX, event.clientY);
    const finish = () => { setHeld(null); setLocalPositions({}); };

    if (target?.kind === "slot" || target?.kind === "seat") {
      const seatId = target.kind === "slot" ? target.seatId : target.id;
      void send({ type: "slotCounter", counterId: drag.counterId, seatId }).finally(finish);
    } else {
      void send({ type: "moveCounter", counterId: drag.counterId, x: x - drag.dx, y: y - drag.dy }).finally(finish);
    }
  };

  const counterProps = (counter: { id: string; x: number; y: number }) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      const { x, y } = toFraction(event.clientX, event.clientY);
      const box = event.currentTarget.getBoundingClientRect();
      const origin = toFraction(box.left + box.width / 2, box.top + box.height / 2);
      counterDragRef.current = { counterId: counter.id, pointerId: event.pointerId, dx: x - origin.x, dy: y - origin.y, startX: event.clientX, startY: event.clientY, moved: false };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = counterDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (!drag.moved) {
        if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4) return;
        drag.moved = true;
        setHeld(drag.counterId);
      }
      const { x, y } = toFraction(event.clientX, event.clientY);
      setLocalPositions({ [drag.counterId]: { x: x - drag.dx, y: y - drag.dy } });
    },
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => endCounterDrag(event, true),
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => endCounterDrag(event, false),
  });

  function pickInside(box: Marquee) {
    const felt = feltRef.current;
    if (!felt) return [];
    const rect = felt.getBoundingClientRect();
    const left = Math.min(box.from.x, box.to.x);
    const right = Math.max(box.from.x, box.to.x);
    const top = Math.min(box.from.y, box.to.y);
    const bottom = Math.max(box.from.y, box.to.y);
    return [...felt.querySelectorAll<HTMLElement>("[data-piece]")]
      .filter((element) => element.dataset.slotted === undefined && element.dataset.fixed === undefined)
      .filter((element) => {
        const box2 = element.getBoundingClientRect();
        const cx = (box2.left + box2.width / 2 - rect.left) / rect.width;
        const cy = (box2.top + box2.height / 2 - rect.top) / rect.height;
        return cx >= left && cx <= right && cy >= top && cy <= bottom;
      })
      .map((element) => element.dataset.piece!)
      .filter(Boolean);
  }

  return {
    feltProps,
    feltRef,
    pieceProps,
    handCardProps,
    counterProps,
    localPositions,
    held,
    carrying,
    takeCount,
    dragCardId,
    hoverTarget,
    marquee,
    selection,
    clearSelection: () => setSelection([]),
  };
}
