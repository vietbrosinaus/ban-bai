"use client";

import { Copy, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HandCursor, MiniFan, PieceWithMenu, ProtoCard, StatePanel } from "./pieces";
import { useTableEngine } from "./engine";
import { cards } from "./sim";

export const NAME = "Bird's eye + tray";

export default function VariantA() {
  const engine = useTableEngine({ dragPeels: false, menuMode: "context" });
  const { state, peers, hands, cursor, ghost, surfaceRef } = engine;
  return (
    <div className="va" {...engine.rootProps}>
      <header className="va-top">
        <b>Bàn Bài</b>
        <Button variant="ghost" size="sm" className="va-room"><Copy />K7QX2M</Button>
        <Separator orientation="vertical" className="va-sep" />
        <div className="va-seats">
          {peers.map((p) => (
            <span key={p.id} style={{ ["--c" as string]: p.color }}><i />{p.name}<MiniFan count={p.handCount} color={p.color} /></span>
          ))}
        </div>
        <Button variant="secondary" size="sm" className="va-invite"><Users />Mời bạn</Button>
      </header>
      <div className="va-body">
        <div className="va-felt" ref={surfaceRef} data-surface>
          {state.pieces.map((piece) => <PieceWithMenu key={piece.id} piece={piece} engine={engine} />)}
          {hands.map((h) => <HandCursor key={h.seatId} x={h.x} y={h.y} color={h.colour} name={h.name} grabbing={h.grabbing} style={{ opacity: h.opacity }} />)}
          {cursor.over && <HandCursor x={cursor.x} y={cursor.y} color="#f4c95d" name="Bạn" grabbing={cursor.grabbing} me />}
        </div>
      </div>
      <div className="va-tray" data-handzone>
        <span className="va-tray-label">Bài trên tay <Badge variant="secondary">{state.hand.length}</Badge></span>
        <div className="va-fan">
          {state.hand.map((card, i) => (
            <div key={card.id} className="va-fan-card" style={{ ["--a" as string]: `${(i - (state.hand.length - 1) / 2) * 6}deg`, ["--i" as string]: i }} {...engine.handCardProps(card)}>
              <ProtoCard id={card.id} faceUp />
              <small>{cards[card.id]?.name}</small>
            </div>
          ))}
          {!state.hand.length && <p className="va-empty">tay trống, rút từ chồng bài</p>}
        </div>
      </div>
      {ghost && <div className="ghost" style={{ left: ghost.x, top: ghost.y }}><ProtoCard id={ghost.cardId} faceUp /></div>}
      <StatePanel engine={engine} />
    </div>
  );
}
