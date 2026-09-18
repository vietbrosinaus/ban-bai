"use client";

import { Eye, FlipHorizontal2, GalleryHorizontalEnd, Hand, HandGrab, Layers, RotateCw, Scissors, Shuffle, SquareStack, type LucideIcon } from "lucide-react";
import { type CSSProperties, type ComponentProps, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { MetaList } from "@/components/ui/meta-list";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from "@/components/ui/context-menu";
import type { Engine, Ghost, MenuAction } from "./engine";
import { STACK_LABEL, cards, type Peer, type Piece } from "./sim";

export function ProtoCard({ id, faceUp, className = "", style }: { id: string; faceUp: boolean; className?: string; style?: CSSProperties }) {
  const info = cards[id];
  const general = info?.kind === "general";
  if (!faceUp) return <div className={`pcard pcard-back ${general ? "pcard-back-general" : ""} ${className}`} style={style}><span><i>{general ? "將" : "殺"}</i></span></div>;
  return <div className={`pcard ${general ? "pcard-general" : ""} ${className}`} style={{ ...style, backgroundImage: `url("${info?.asset ?? ""}")` }} title={info?.name ?? id}>{general && <b>{info.name}</b>}</div>;
}

export function PieceView({ piece, engine, ...rest }: { piece: Piece; engine: Engine } & ComponentProps<"div">) {
  const n = piece.cards.length;
  const top = piece.cards[n - 1];
  const layers = Math.min(3, Math.max(0, n - 1));
  const peeking = engine.state.peekId === piece.id;
  const held = engine.held === piece.id;
  const { className: extraClass, style: extraStyle, ...triggerProps } = rest;
  const handlers = engine.pieceProps(piece);
  return (
    <div
      {...handlers}
      {...triggerProps}
      onPointerDown={(e) => { handlers.onPointerDown(e); triggerProps.onPointerDown?.(e); }}
      className={`piece ${held ? "is-held" : ""} ${piece.tag ? "is-tagged" : ""} ${extraClass ?? ""}`}
      style={{ left: `${piece.x * 100}%`, top: `${piece.y * 100}%`, "--rot": `${piece.rot}deg`, ...extraStyle } as CSSProperties}
    >
      {Array.from({ length: layers }, (_, i) => <span key={i} className="piece-layer" style={{ transform: `translate(${(layers - i) * 2.5}px, ${(layers - i) * 2.5}px)` }} />)}
      {top ? <ProtoCard id={top.id} faceUp={top.faceUp || peeking} /> : <span className="piece-empty">{piece.tag ? STACK_LABEL[piece.tag] : ""}</span>}
      {n > 1 && <Badge className="piece-count" variant="destructive">{n}</Badge>}
      {piece.tag && <Badge className="piece-tag" variant="secondary">{STACK_LABEL[piece.tag]}</Badge>}
    </div>
  );
}

type MenuEntry = { action: MenuAction; label: string; icon: LucideIcon; keys?: string };

export function menuItems(engine: Engine, pieceId: string): MenuEntry[] {
  const piece = engine.state.pieces.find((p) => p.id === pieceId);
  if (!piece) return [];
  const n = piece.cards.length;
  const top = piece.cards[n - 1];
  const entries: Array<MenuEntry | false> = [
    n > 0 && { action: "flip", label: "Lật lá trên", icon: FlipHorizontal2, keys: "Nháy đúp" },
    n > 1 && { action: "flipAll", label: "Lật cả chồng", icon: SquareStack },
    n > 0 && { action: "rotate", label: "Xoay 90°", icon: RotateCw, keys: "Lăn chuột" },
    n > 1 && { action: "shuffle", label: "Xào", icon: Shuffle },
    n > 1 && { action: "spread", label: "Trải ra", icon: GalleryHorizontalEnd },
    n > 0 && { action: "draw1", label: "Rút 1 lá", icon: Hand, keys: "Chuột giữa" },
    n > 2 && { action: "draw3", label: "Rút 3 lá", icon: Layers },
    n > 1 && { action: "cut", label: "Cắt đôi", icon: Scissors },
    n > 0 && { action: "takeAll", label: "Cầm hết", icon: HandGrab },
    Boolean(top && !top.faceUp) && { action: "peek", label: "Xem lén", icon: Eye, keys: "Giữ chuột" },
  ];
  return entries.filter((e): e is MenuEntry => Boolean(e));
}

export function PieceWithMenu({ piece, engine }: { piece: Piece; engine: Engine }) {
  const items = menuItems(engine, piece.id);
  const advanced = items.filter((i) => !i.keys);
  const direct = items.filter((i) => i.keys);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <PieceView piece={piece} engine={engine} />
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel className="flex items-center gap-2">
          <Layers className="size-3.5" />
          {piece.tag ? STACK_LABEL[piece.tag] : piece.cards.length > 1 ? `Chồng ${piece.cards.length} lá` : "Một lá"}
        </ContextMenuLabel>
        <ContextMenuSeparator />
        {advanced.map(({ action, label, icon: Icon }) => (
          <ContextMenuItem key={action} onSelect={() => engine.act(piece.id, action)}><Icon />{label}</ContextMenuItem>
        ))}
        {direct.length > 0 && <ContextMenuSeparator />}
        {direct.map(({ action, label, icon: Icon, keys }) => (
          <ContextMenuItem key={action} onSelect={() => engine.act(piece.id, action)}>
            <Icon />{label}<ContextMenuShortcut>{keys}</ContextMenuShortcut>
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}

export const RADIAL_ICONS: Record<MenuAction, LucideIcon> = {
  flip: FlipHorizontal2, flipAll: SquareStack, rotate: RotateCw, shuffle: Shuffle,
  spread: GalleryHorizontalEnd, draw1: Hand, draw3: Layers, cut: Scissors, takeAll: HandGrab, peek: Eye,
};

const openHand = (
  <>
    <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
    <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </>
);
const closedHand = (
  <>
    <path d="M18 11.5V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1.4" />
    <path d="M14 10V8a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
    <path d="M10 9.9V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v5" />
    <path d="M6 14a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
    <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8 2 2 0 1 1 4 0" />
  </>
);

export function HandCursor({ x, y, color, name, grabbing, me = false, style }: { x: number; y: number; color: string; name: string; grabbing: boolean; me?: boolean; style?: CSSProperties }) {
  return (
    <div className={`cursor ${me ? "cursor-me" : ""}`} style={{ left: `${x * 100}%`, top: `${y * 100}%`, color, ...style }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{grabbing ? closedHand : openHand}</svg>
      {!me && <span className="cursor-name" style={{ background: color }}>{name}</span>}
    </div>
  );
}

export function PeerCursors({ peers }: { peers: Peer[] }) {
  return <>{peers.map((p) => <HandCursor key={p.id} x={p.x} y={p.y} color={p.color} name={p.name} grabbing={p.grabbing} />)}</>;
}

export function GhostCard({ ghost }: { ghost: Ghost }) {
  return <div className="ghost" style={{ left: ghost.x, top: ghost.y }}><ProtoCard id={ghost.cardId} faceUp /></div>;
}

export function MiniFan({ count, color }: { count: number; color?: string }) {
  const n = Math.min(count, 8);
  return <span className="mini-fan" style={{ "--c": color } as CSSProperties}>{Array.from({ length: n }, (_, i) => <i key={i} style={{ "--a": `${(i - (n - 1) / 2) * 9}deg` } as CSSProperties} />)}</span>;
}

export function StatePanel({ engine }: { engine: Engine }) {
  const [open, setOpen] = useState(true);
  const { state } = engine;
  return (
    <aside className="state-panel">
      <header onClick={() => setOpen((o) => !o)}><span>state</span><span>{open ? "hide" : "show"}</span></header>
      {open && (
        <>
          <MetaList className="flex-wrap">
            <span>pieces {state.pieces.length}</span>
            <span>hand {state.hand.length}</span>
            <span>seq {state.seq}</span>
          </MetaList>
          <MetaList className="flex-wrap text-[color:var(--gold)]">
            <span>you sent {engine.sent}</span>
            <span>peers sent {engine.peerMessages}</span>
            <span>anchor {engine.myAnchor.kind}</span>
          </MetaList>
          <ol>{[...state.events].reverse().map((e) => <li key={e.id}><b>{e.who}</b> {e.text}</li>)}</ol>
        </>
      )}
    </aside>
  );
}
