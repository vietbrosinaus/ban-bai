"use client";

import { type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent, type MouseEvent as ReactMouseEvent, useCallback, useEffect, useReducer, useRef, useState } from "react";

import { type Anchor, type Hand, PRESENCE, nextAnchorToSend, placeHands, seatRing } from "@/lib/domain/presence";
import { type CardRef, type Piece, PEERS, initialState, pieceName, reduce } from "./sim";

export type ResolvedHand = { seatId: string; name: string; colour: string; x: number; y: number; grabbing: boolean; opacity: number };

const SEAT_COUNT = PEERS.length + 1;
const SEAT_INDEX: Record<string, number> = { me: 0, ...Object.fromEntries(PEERS.map((peer, index) => [peer.id, index + 1])) };

function nameOf(seatId: string) {
  return PEERS.find((peer) => peer.id === seatId)?.name ?? seatId;
}

export type Mapper = (clientX: number, clientY: number, surface: HTMLElement) => { x: number; y: number };
export type EngineOptions = { dragPeels: boolean; menuMode: "context" | "radial"; mapper?: Mapper };
export type Menu = { x: number; y: number; pieceId: string };
export type Ghost = { cardId: string; x: number; y: number };
export type Cursor = { x: number; y: number; over: boolean; grabbing: boolean };
export type MenuAction = "flip" | "flipAll" | "rotate" | "shuffle" | "spread" | "draw1" | "draw3" | "cut" | "takeAll" | "peek";

type Drag = { pieceId: string; pointerId: number; dx: number; dy: number; startX: number; startY: number; moved: boolean; peel: boolean };
type HandDrag = { cardId: string; pointerId: number; startX: number; startY: number; moved: boolean };
type DropTarget = { kind: "piece"; id: string } | { kind: "hand" } | { kind: "surface" } | null;

const defaultMapper: Mapper = (clientX, clientY, surface) => {
  const rect = surface.getBoundingClientRect();
  return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height };
};

function dropTarget(clientX: number, clientY: number, ignoreId?: string): DropTarget {
  for (const element of document.elementsFromPoint(clientX, clientY)) {
    const data = (element as HTMLElement).dataset ?? {};
    if (data.piece && data.piece !== ignoreId) return { kind: "piece", id: data.piece };
    if (data.handzone !== undefined) return { kind: "hand" };
    if (data.surface !== undefined) return { kind: "surface" };
  }
  return null;
}

export function useTableEngine(options: EngineOptions) {
  const [state, dispatch] = useReducer(reduce, undefined, initialState);
  const [peerMessages, setPeerMessages] = useState(0);
  const [cursor, setCursor] = useState<Cursor>({ x: 0.5, y: 0.75, over: false, grabbing: false });
  const [menu, setMenu] = useState<Menu | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [held, setHeld] = useState<string | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const optionsRef = useRef(options);
  const stateRef = useRef(state);
  useEffect(() => {
    optionsRef.current = options;
    stateRef.current = state;
  });
  const heldRef = useRef<string | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const handDragRef = useRef<HandDrag | null>(null);
  const counter = useRef(0);
  const uid = () => `piece-${(counter.current += 1)}`;

  const toFraction = useCallback((clientX: number, clientY: number) => {
    const surface = surfaceRef.current;
    if (!surface) return { x: 0.5, y: 0.5 };
    return (optionsRef.current.mapper ?? defaultMapper)(clientX, clientY, surface);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  const [hands, setHands] = useState<Hand[]>(() =>
    PEERS.map((peer) => ({ seatId: peer.id, anchor: { kind: "home" } as Anchor, grabbing: false, changedAt: 0 }))
  );
  const [myAnchor, setMyAnchor] = useState<Anchor>({ kind: "home" });
  const [sent, setSent] = useState(0);
  const [now, setNow] = useState(0);
  const lastSentRef = useRef<{ anchor: Anchor; sentAt: number } | null>(null);
  const settleRef = useRef<number | null>(null);

  const emit = useCallback((anchor: Anchor) => {
    const now = performance.now();
    if (!nextAnchorToSend(anchor, lastSentRef.current, now)) return;
    lastSentRef.current = { anchor, sentAt: now };
    setMyAnchor(anchor);
    setSent((count) => count + 1);
  }, []);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(performance.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    type Brain = { seatId: string; anchor: Anchor; grabbing: boolean; changedAt: number; nextAt: number; step: "idle" | "reaching" | "holding" };
    const rand = Math.random;
    const brains: Brain[] = PEERS.map((peer, index) => ({
      seatId: peer.id,
      anchor: { kind: "home" },
      grabbing: false,
      changedAt: 0,
      nextAt: 900 + index * 700,
      step: "idle",
    }));
    const started = performance.now();
    let messages = 0;

    const set = (brain: Brain, anchor: Anchor, grabbing: boolean, waitMs: number, step: Brain["step"]) => {
      brain.anchor = anchor;
      brain.grabbing = grabbing;
      brain.changedAt = performance.now();
      brain.nextAt = performance.now() - started + waitMs;
      brain.step = step;
      messages += 1;
    };

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const elapsed = performance.now() - started;
      const pieces = stateRef.current.pieces;
      for (const brain of brains) {
        if (elapsed < brain.nextAt) continue;
        const free = pieces.filter((piece) => piece.cards.length && piece.id !== heldRef.current);
        if (brain.step === "idle" && free.length && rand() < 0.75) {
          const piece = free[Math.floor(rand() * free.length)];
          set(brain, { kind: "piece", id: piece.id }, false, 700 + rand() * 900, "reaching");
        } else if (brain.step === "reaching" && brain.anchor.kind === "piece") {
          const piece = pieces.find((item) => item.id === (brain.anchor as { id: string }).id);
          if (!piece || piece.id === heldRef.current) { set(brain, { kind: "home" }, false, 1500, "idle"); continue; }
          dispatch({ type: "lift", id: piece.id });
          dispatch({ type: "note", who: nameOf(brain.seatId), text: `picked up ${pieceName(piece)}` });
          set(brain, brain.anchor, true, 800 + rand() * 900, "holding");
        } else if (brain.step === "holding" && brain.anchor.kind === "piece") {
          const id = (brain.anchor as { id: string }).id;
          const piece = pieces.find((item) => item.id === id);
          if (piece) {
            dispatch({ type: "move", id, x: 0.24 + rand() * 0.58, y: 0.2 + rand() * 0.56 });
            dispatch({ type: "note", who: nameOf(brain.seatId), text: `put ${pieceName(piece)} down` });
          }
          set(brain, { kind: "home" }, false, 1800 + rand() * 3200, "idle");
        } else {
          set(brain, { kind: "home" }, false, 1600 + rand() * 3000, "idle");
        }
      }
      setHands(brains.map(({ seatId, anchor, grabbing, changedAt }) => ({ seatId, anchor, grabbing, changedAt })));
      setPeerMessages(messages);
    }, 260);

    return () => window.clearInterval(timer);
  }, []);

  const endPieceDrag = (e: ReactPointerEvent<HTMLDivElement>, drop: boolean) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    heldRef.current = null;
    setHeld(null);
    setCursor((c) => ({ ...c, grabbing: false }));
    if (!drop || !drag.moved) return;
    const target = dropTarget(e.clientX, e.clientY, drag.pieceId);
    if (target?.kind === "piece") dispatch({ type: "merge", from: drag.pieceId, onto: target.id, who: "you" });
    else if (target?.kind === "hand") dispatch({ type: "takeAll", id: drag.pieceId });
  };

  const pieceProps = (piece: Piece) => ({
    "data-piece": piece.id,
    ...(options.menuMode === "radial" ? {
      onContextMenu: (e: ReactMouseEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY, pieceId: piece.id }); },
    } : null),
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (e.button === 1) { e.preventDefault(); dispatch({ type: "draw", id: piece.id, count: 1 }); return; }
      if (e.button !== 0) return;
      const { x, y } = toFraction(e.clientX, e.clientY);
      const peel = optionsRef.current.dragPeels ? !e.shiftKey : e.shiftKey;
      dispatch({ type: "lift", id: piece.id });
      dragRef.current = { pieceId: piece.id, pointerId: e.pointerId, dx: x - piece.x, dy: y - piece.y, startX: e.clientX, startY: e.clientY, moved: false, peel };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      if (!drag.moved) {
        if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 4) return;
        drag.moved = true;
        const current = stateRef.current.pieces.find((p) => p.id === drag.pieceId);
        if (drag.peel && current && current.cards.length > 1) {
          const newId = uid();
          dispatch({ type: "split", id: current.id, count: 1, newId, x: current.x, y: current.y, who: "you" });
          drag.pieceId = newId;
        }
        heldRef.current = drag.pieceId;
        setHeld(drag.pieceId);
        setCursor((c) => ({ ...c, grabbing: true }));
      }
      const { x, y } = toFraction(e.clientX, e.clientY);
      dispatch({ type: "move", id: drag.pieceId, x: x - drag.dx, y: y - drag.dy });
    },
    onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => endPieceDrag(e, true),
    onPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => endPieceDrag(e, false),
    onDoubleClick: () => dispatch({ type: "flip", id: piece.id, who: "you" }),
    onWheel: (e: ReactWheelEvent<HTMLDivElement>) => dispatch({ type: "rotate", id: piece.id, delta: e.deltaY > 0 ? 15 : -15 }),
    onAuxClick: (e: ReactMouseEvent<HTMLDivElement>) => e.preventDefault(),
  });

  const endHandDrag = (e: ReactPointerEvent<HTMLDivElement>, drop: boolean) => {
    const drag = handDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    handDragRef.current = null;
    setGhost(null);
    setCursor((c) => ({ ...c, grabbing: false }));
    if (!drop || !drag.moved) return;
    const target = dropTarget(e.clientX, e.clientY);
    const faceUp = !e.shiftKey;
    if (target?.kind === "piece") dispatch({ type: "playOnto", cardId: drag.cardId, onto: target.id, faceUp });
    else if (target?.kind === "surface") {
      const { x, y } = toFraction(e.clientX, e.clientY);
      dispatch({ type: "play", cardId: drag.cardId, x, y, faceUp, newId: uid() });
    }
  };

  const handCardProps = (card: CardRef) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      handDragRef.current = { cardId: card.id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = handDragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 4) return;
      drag.moved = true;
      setGhost({ cardId: drag.cardId, x: e.clientX, y: e.clientY });
      setCursor((c) => ({ ...c, grabbing: true }));
    },
    onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => endHandDrag(e, true),
    onPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => endHandDrag(e, false),
    onContextMenu: (e: ReactMouseEvent<HTMLDivElement>) => e.preventDefault(),
  });

  const rootProps = {
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "touch") return;
      const { x, y } = toFraction(e.clientX, e.clientY);
      const over = x >= 0 && x <= 1 && y >= 0 && y <= 1;
      setCursor((c) => ({ ...c, x, y, over }));
      if (settleRef.current !== null) window.clearTimeout(settleRef.current);
      if (!over) { emit({ kind: "home" }); return; }
      const target = e.target instanceof Element ? e.target.closest("[data-piece]") : null;
      const pieceId = target instanceof HTMLElement ? target.dataset.piece : undefined;
      const anchor: Anchor = pieceId ? { kind: "piece", id: pieceId } : { kind: "point", x, y };
      settleRef.current = window.setTimeout(() => emit(anchor), PRESENCE.settleMs);
    },
    onPointerLeave: () => {
      if (settleRef.current !== null) window.clearTimeout(settleRef.current);
      setCursor((c) => ({ ...c, over: false }));
      emit({ kind: "home" });
    },
    onContextMenu: (e: ReactMouseEvent<HTMLDivElement>) => { if (optionsRef.current.menuMode === "radial") e.preventDefault(); },
  };

  const act = (pieceId: string, action: MenuAction) => {
    setMenu(null);
    switch (action) {
      case "flip": dispatch({ type: "flip", id: pieceId, who: "you" }); break;
      case "flipAll": dispatch({ type: "flip", id: pieceId, whole: true, who: "you" }); break;
      case "rotate": dispatch({ type: "rotate", id: pieceId, delta: 90 }); break;
      case "shuffle": dispatch({ type: "shuffle", id: pieceId, seed: Math.floor(Math.random() * 1e9), who: "you" }); break;
      case "spread": dispatch({ type: "spread", id: pieceId, who: "you" }); break;
      case "draw1": dispatch({ type: "draw", id: pieceId, count: 1 }); break;
      case "draw3": dispatch({ type: "draw", id: pieceId, count: 3 }); break;
      case "cut": {
        const piece = stateRef.current.pieces.find((p) => p.id === pieceId);
        if (piece && piece.cards.length > 1) dispatch({ type: "split", id: pieceId, count: Math.floor(piece.cards.length / 2), newId: uid(), x: Math.min(0.94, piece.x + 0.09), y: piece.y, who: "you" });
        break;
      }
      case "takeAll": dispatch({ type: "takeAll", id: pieceId }); break;
      case "peek": dispatch({ type: "peek", id: pieceId }); window.setTimeout(() => dispatch({ type: "peek", id: null }), 1500); break;
    }
  };

  const layout = {
    piece: (id: string) => {
      const piece = state.pieces.find((item) => item.id === id);
      return piece ? { x: piece.x, y: piece.y } : undefined;
    },
    seat: (id: string) => {
      const index = SEAT_INDEX[id];
      return index === undefined ? undefined : seatRing(index, SEAT_COUNT);
    },
    fallback: { x: 0.5, y: 0.5 },
  };

  const resolvedHands: ResolvedHand[] = placeHands(hands, layout, now).map((placed) => {
    const peer = PEERS.find((item) => item.id === placed.seatId);
    return { ...placed, name: peer?.name ?? placed.seatId, colour: peer?.color ?? "#ffffff" };
  });

  return { state, dispatch, peers: PEERS, hands: resolvedHands, myAnchor, sent, peerMessages, cursor, menu, setMenu, ghost, held, surfaceRef, rootProps, pieceProps, handCardProps, act, emit, options };
}

export type Engine = ReturnType<typeof useTableEngine>;
