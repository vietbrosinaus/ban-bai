"use client";

import type { ReactNode } from "react";

import { MetaList } from "@/components/ui/meta-list";
import { HandCursor, PieceWithMenu, ProtoCard, StatePanel } from "./pieces";
import { useTableEngine } from "./engine";
import { cards } from "./sim";

export const NAME = "Seated view, held hand";

function HeldHand({ children }: { children: ReactNode }) {
  return (
    <div className="vb-held">
      <svg className="vb-hand-art" viewBox="0 0 400 150" aria-hidden>
        <defs><linearGradient id="skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f6d3b0" /><stop offset="100%" stopColor="#cf9463" /></linearGradient></defs>
        <g fill="url(#skin)" stroke="#a9703f" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
          <path d="M132 150c-26-14-42-40-46-74-2-16 6-27 18-29 11-2 19 5 23 18l5 15V38c0-12 8-20 19-20s19 8 19 20v42" />
          <path d="M170 80V28c0-12 8-20 19-20s19 8 19 20v52" />
          <path d="M208 80V36c0-12 8-20 19-20s19 8 19 20v46" />
          <path d="M246 82V48c0-11 8-19 18-19s18 8 18 19v40c0 34-14 52-40 62z" />
          <path d="M112 62c-10-6-21-3-24 7-3 11 4 20 14 27" opacity=".9" />
        </g>
      </svg>
      <div className="vb-arc">{children}</div>
    </div>
  );
}

export default function VariantB() {
  const engine = useTableEngine({ dragPeels: false, menuMode: "context" });
  const { state, peers, hands, cursor, ghost, surfaceRef } = engine;
  return (
    <div className="vb" {...engine.rootProps}>
      <div className="vb-room">
        <div className="vb-opponents">
          {peers.map((p) => (
            <div key={p.id} className="vb-seat" style={{ ["--c" as string]: p.color }}>
              <div className="vb-seat-fan">{Array.from({ length: Math.min(p.handCount, 7) }, (_, i) => <span key={i} style={{ ["--a" as string]: `${(i - (Math.min(p.handCount, 7) - 1) / 2) * 11}deg` }} />)}</div>
              <b>{p.name}</b><small>{p.handCount} lá</small>
            </div>
          ))}
        </div>
        <div className="vb-plane">
          <div className="vb-felt" ref={surfaceRef} data-surface>
            {state.pieces.map((piece) => <PieceWithMenu key={piece.id} piece={piece} engine={engine} />)}
            {hands.map((h) => <HandCursor key={h.seatId} x={h.x} y={h.y} color={h.colour} name={h.name} grabbing={h.grabbing} style={{ opacity: h.opacity }} />)}
            {cursor.over && <HandCursor x={cursor.x} y={cursor.y} color="#f4c95d" name="Bạn" grabbing={cursor.grabbing} me />}
          </div>
          <div className="vb-edge" />
        </div>
      </div>
      <div className="vb-tray" data-handzone>
        <HeldHand>
          {state.hand.map((card, i) => (
            <div key={card.id} className="vb-held-card" style={{ ["--a" as string]: `${(i - (state.hand.length - 1) / 2) * 7}deg`, ["--i" as string]: i }} {...engine.handCardProps(card)} title={cards[card.id]?.name}>
              <ProtoCard id={card.id} faceUp />
            </div>
          ))}
        </HeldHand>
        <MetaList className="vb-tray-hint flex-wrap">
          <span>{state.hand.length} lá trên tay</span>
          <span>kéo lên bàn để đánh</span>
          <span>giữ Shift để úp</span>
        </MetaList>
      </div>
      {ghost && <div className="ghost" style={{ left: ghost.x, top: ghost.y }}><ProtoCard id={ghost.cardId} faceUp /></div>}
      <StatePanel engine={engine} />
    </div>
  );
}
