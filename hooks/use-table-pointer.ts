"use client";

import { type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent, useCallback, useEffect, useRef, useState } from "react";

import { PRESENCE, type Anchor } from "@/lib/domain/presence";
import { toast } from "sonner";

import { onTable, type Command, type TablePiece } from "@/lib/domain/table";
import type { Point, SeatSlot } from "@/lib/domain/card";
import { cardFace } from "@/lib/domain/deck";
import type { Carry } from "@/lib/domain/protocol";

type DropTarget = { kind: "piece"; id: string } | { kind: "slot"; seatId: string; slot: SeatSlot } | { kind: "seat"; id: string } | { kind: "hand" } | { kind: "felt" } | null;

type Drag = { pieceId: string; pointerId: number; dx: number; dy: number; startX: number; startY: number; moved: boolean; peel: boolean; count: number; cards: number; topCard: string | null };

const NO_SLOT = "Không ô nào nhận lá này. Kéo lên bàn để đánh.";
type CounterDrag = { counterId: string; pointerId: number; dx: number; dy: number; startX: number; startY: number; moved: boolean };
type HandDrag = { cardId: string; pointerId: number; startX: number; startY: number; moved: boolean; flip: boolean };

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
  setDrag,
  setCarry,
  ping,
  landing,
  peelDefault = false,
}: {
  send: (command: Command) => Promise<unknown>;
  setAnchor: (anchor: Anchor, grabbing?: boolean) => void;
  setDrag: (pieceId: string | null, x: number, y: number) => void;
  setCarry: (carry: Carry | null) => void;
  ping: (x: number, y: number) => void;
  landing: (seatId: string, slot: SeatSlot, cardId: string) => SeatSlot | null;
  peelDefault?: boolean;
}) {
  const feltRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const handDragRef = useRef<HandDrag | null>(null);
  const counterDragRef = useRef<CounterDrag | null>(null);
  const draggedRef = useRef(false);
  const settleRef = useRef<number | null>(null);
  const [localPositions, setLocalPositions] = useState<Record<string, Point>>({});
  const [held, setHeld] = useState<string | null>(null);
  const [carrying, setCarrying] = useState<{ cardId: string; x: number; y: number } | null>(null);
  const [takeCount, setTakeCount] = useState(0);
  const [lifted, setLifted] = useState<{ pieceId: string; x: number; y: number } | null>(null);
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [hoverTarget, setHoverTarget] = useState<DropTarget>(null);

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

  const trackHand = (clientX: number, clientY: number, grabbing = false) => {
    const { x, y } = toFraction(clientX, clientY);
    const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
    const anchor: Anchor = inside ? { kind: "point", x, y } : { kind: "home" };
    setAnchor(anchor, grabbing);
    settle(anchor, grabbing);
  };

  const feltProps = {
    "data-felt": "",
    ref: feltRef,
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "touch") return;
      if (dragRef.current?.moved) return;
      trackHand(event.clientX, event.clientY);
    },
    onPointerLeave: () => {
      if (settleRef.current !== null) window.clearTimeout(settleRef.current);
      setAnchor({ kind: "home" });
    },
    onContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => event.preventDefault(),
    onDoubleClick: (event: ReactMouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-piece],[data-seat],[data-slot-seat],[data-counter],[data-overlay]")) return;
      const { x, y } = toFraction(event.clientX, event.clientY);
      ping(x, y);
    },
  };

  const endDrag = (pointerId: number, clientX: number, clientY: number, drop: boolean) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    dragRef.current = null;
    setTakeCount(0);
    setLifted(null);
    trackHand(clientX, clientY, false);
    if (!drop || !drag.moved) setDrag(null, 0, 0);
    setDragCardId(null);
    setHoverTarget(null);
    if (!drop || !drag.moved) { setHeld(null); setLocalPositions({}); return; }

    const target = hitTest(clientX, clientY, drag.pieceId);
    const { x, y } = toFraction(clientX, clientY);
    const finish = () => { setHeld(null); setLocalPositions({}); setDrag(null, 0, 0); };

    if (target?.kind === "hand") void send({ type: "takeToHand", pieceId: drag.pieceId, count: drag.peel ? drag.count : drag.cards }).finally(finish);
    else if (drag.peel && drag.count < drag.cards) void send({ type: "split", pieceId: drag.pieceId, count: drag.count, x: x - drag.dx, y: y - drag.dy }).finally(finish);
    else if (target?.kind === "piece") void send({ type: "merge", pieceId: drag.pieceId, ontoId: target.id }).finally(finish);
    else if (target?.kind === "slot") {
      const slot = drag.topCard ? landing(target.seatId, target.slot, drag.topCard) : target.slot;
      if (slot) void send({ type: "placeInSlot", pieceId: drag.pieceId, seatId: target.seatId, slot }).finally(finish);
      else { toast.error(NO_SLOT, { id: NO_SLOT }); finish(); }
    }
    else void send({ type: "move", pieceId: drag.pieceId, x: x - drag.dx, y: y - drag.dy }).finally(finish);
  };

  const pieceProps = (piece: TablePiece, onClick?: () => void) => ({
    "data-piece": piece.id,
    onClick: () => { if (!draggedRef.current) onClick?.(); },
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button === 1) { event.preventDefault(); void send({ type: "flipTop", pieceId: piece.id }); return; }
      if (event.button !== 0) return;
      event.stopPropagation();
      draggedRef.current = false;
      const { x, y } = toFraction(event.clientX, event.clientY);
      const box = event.currentTarget.getBoundingClientRect();
      const origin = toFraction(box.left + box.width / 2, box.top + box.height / 2);
      const peel = peelDefault ? !event.shiftKey : event.shiftKey;
      dragRef.current = { pieceId: piece.id, pointerId: event.pointerId, dx: x - origin.x, dy: y - origin.y, startX: event.clientX, startY: event.clientY, moved: false, peel, count: 1, cards: piece.cards.length, topCard: piece.cards.at(-1)?.faceUp ? piece.cards.at(-1)!.id : null };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (!drag.moved) {
        if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4) return;
        drag.moved = true;
        draggedRef.current = true;
        setHeld(drag.pieceId);
        trackHand(event.clientX, event.clientY, true);
        const top = piece.cards[piece.cards.length - 1];
        setDragCardId(top?.faceUp ? top.id : null);
        if (drag.peel && piece.cards.length > 1) setTakeCount(drag.count);
      }
      setHoverTarget(hitTest(event.clientX, event.clientY, drag.pieceId));
      trackHand(event.clientX, event.clientY, true);
      const { x, y } = toFraction(event.clientX, event.clientY);
      if (x < 0 || x > 1 || y < 0 || y > 1) {
        setLifted({ pieceId: drag.pieceId, x: event.clientX, y: event.clientY });
        return;
      }
      setLifted(null);
      const at = onTable(x - drag.dx, y - drag.dy);
      setLocalPositions({ [drag.pieceId]: at });
      if (!drag.peel) setDrag(drag.pieceId, at.x, at.y);
    },
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => endDrag(event.pointerId, event.clientX, event.clientY, true),
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => endDrag(event.pointerId, event.clientX, event.clientY, false),
    onDoubleClick: () => void send({ type: "takeToHand", pieceId: piece.id, count: 1 }),
    onContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      void send({ type: "flipTop", pieceId: piece.id });
    },
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

  const endHandDrag = (pointerId: number, clientX: number, clientY: number, drop: boolean, shifted: boolean) => {
    const drag = handDragRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    const faceUp = drag.flip || shifted;
    handDragRef.current = null;
    setCarrying(null);
    if (drag.moved) trackHand(clientX, clientY, false);
    setDragCardId(null);
    setHoverTarget(null);
    if (!drop || !drag.moved) { if (drag.moved) setCarry(null); return; }

    const target = hitTest(clientX, clientY);
    if (target?.kind === "slot") {
      const slot = landing(target.seatId, target.slot, drag.cardId);
      if (slot) void send({ type: "playToSlot", cardId: drag.cardId, seatId: target.seatId, slot, faceUp });
      else toast.error(NO_SLOT, { id: NO_SLOT });
    }
    else if (target?.kind === "piece") void send({ type: "playOntoPiece", cardId: drag.cardId, pieceId: target.id, faceUp });
    else if (target?.kind === "seat") void send({ type: "giveToSeat", cardId: drag.cardId, seatId: target.id });
    else if (target?.kind === "felt") {
      const { x, y } = toFraction(clientX, clientY);
      void send({ type: "playToTable", cardId: drag.cardId, x, y, faceUp });
    }
    setCarry(null);
  };

  const handCardProps = (cardId: string, onClick?: () => void) => ({
    onClick: () => { if (!draggedRef.current) onClick?.(); },
    onContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => event.preventDefault(),
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.button !== 2) return;
      event.stopPropagation();
      draggedRef.current = false;
      handDragRef.current = { cardId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false, flip: event.button === 2 };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = handDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4) return;
      drag.moved = true;
      draggedRef.current = true;
      setDragCardId(drag.cardId);
      setHoverTarget(hitTest(event.clientX, event.clientY));
      setCarrying({ cardId: drag.cardId, x: event.clientX, y: event.clientY });
      trackHand(event.clientX, event.clientY, true);
      const at = toFraction(event.clientX, event.clientY);
      setCarry({ x: at.x, y: at.y, back: cardFace(drag.cardId)?.kind === "general" ? "general" : "play" });
    },
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => endHandDrag(event.pointerId, event.clientX, event.clientY, true, event.shiftKey),
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => endHandDrag(event.pointerId, event.clientX, event.clientY, false, false),
  });

  const endCounterDrag = (pointerId: number, clientX: number, clientY: number, drop: boolean) => {
    const drag = counterDragRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    counterDragRef.current = null;
    if (drag.moved) trackHand(clientX, clientY, false);
    if (!drop || !drag.moved) { setHeld(null); setLocalPositions({}); if (drag.moved) setDrag(null, 0, 0); return; }

    const target = hitTest(clientX, clientY);
    const { x, y } = toFraction(clientX, clientY);
    const finish = () => { setHeld(null); setLocalPositions({}); setDrag(null, 0, 0); };

    if (target?.kind === "slot" || target?.kind === "seat") {
      const seatId = target.kind === "slot" ? target.seatId : target.id;
      void send({ type: "slotCounter", counterId: drag.counterId, seatId }).finally(finish);
    } else {
      void send({ type: "moveCounter", counterId: drag.counterId, x: x - drag.dx, y: y - drag.dy }).finally(finish);
    }
  };

  const counterProps = (counter: { id: string; x: number; y: number }, onClick?: () => void) => ({
    "data-counter": counter.id,
    onClick: () => { if (!draggedRef.current) onClick?.(); },
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      draggedRef.current = false;
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
        draggedRef.current = true;
        setHeld(drag.counterId);
      }
      const { x, y } = toFraction(event.clientX, event.clientY);
      const at = onTable(x - drag.dx, y - drag.dy);
      trackHand(event.clientX, event.clientY, true);
      setLocalPositions({ [drag.counterId]: at });
      setDrag(drag.counterId, at.x, at.y);
    },
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => endCounterDrag(event.pointerId, event.clientX, event.clientY, true),
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => endCounterDrag(event.pointerId, event.clientX, event.clientY, false),
  });

  const endersRef = useRef({ endDrag, endHandDrag, endCounterDrag });
  useEffect(() => { endersRef.current = { endDrag, endHandDrag, endCounterDrag }; });

  useEffect(() => {
    const settle = (event: PointerEvent, drop: boolean) => {
      const { endDrag: piece, endHandDrag: hand, endCounterDrag: counter } = endersRef.current;
      piece(event.pointerId, event.clientX, event.clientY, drop);
      hand(event.pointerId, event.clientX, event.clientY, drop, event.shiftKey);
      counter(event.pointerId, event.clientX, event.clientY, drop);
    };
    const onUp = (event: PointerEvent) => settle(event, true);
    const onCancel = (event: PointerEvent) => settle(event, false);
    const onLeave = () => {
      const { endDrag: piece, endHandDrag: hand, endCounterDrag: counter } = endersRef.current;
      for (const id of [dragRef.current?.pointerId, handDragRef.current?.pointerId, counterDragRef.current?.pointerId]) {
        if (id === undefined) continue;
        piece(id, 0, 0, false);
        hand(id, 0, 0, false, false);
        counter(id, 0, 0, false);
      }
    };

    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onLeave);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onLeave);
    };
  }, []);

  return { feltProps, feltRef, pieceProps, handCardProps, counterProps, localPositions, held, lifted, carrying, takeCount, dragCardId, hoverTarget };
}
