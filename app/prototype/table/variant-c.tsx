"use client";

import { MetaList } from "@/components/ui/meta-list";
import { HandCursor, PieceView, ProtoCard, RADIAL_ICONS, StatePanel, menuItems } from "./pieces";
import { useTableEngine } from "./engine";

export const NAME = "One canvas, radial menu";

export default function VariantC() {
  const engine = useTableEngine({ dragPeels: true, menuMode: "radial" });
  const { state, peers, hands, cursor, menu, ghost, surfaceRef } = engine;
  const items = menu ? menuItems(engine, menu.pieceId) : [];
  return (
    <div className="vc" {...engine.rootProps}>
      <div className="vc-canvas" ref={surfaceRef} data-surface>
        {state.pieces.map((piece) => <PieceView key={piece.id} piece={piece} engine={engine} />)}
        {hands.map((h) => <HandCursor key={h.seatId} x={h.x} y={h.y} color={h.colour} name={h.name} grabbing={h.grabbing} style={{ opacity: h.opacity }} />)}
        {cursor.over && <HandCursor x={cursor.x} y={cursor.y} color="#f4c95d" name="Bạn" grabbing={cursor.grabbing} me />}
        <div className="vc-peers">{peers.map((p) => <span key={p.id} style={{ ["--c" as string]: p.color }}>{p.name} <b>{p.handCount}</b></span>)}</div>
      </div>
      <div className="vc-strip" data-handzone>
        {state.hand.map((card, i) => (
          <div key={card.id} className="vc-strip-card" style={{ ["--i" as string]: i }} {...engine.handCardProps(card)}>
            <ProtoCard id={card.id} faceUp />
          </div>
        ))}
        <MetaList className="vc-strip-label"><span>chỉ bạn thấy</span><span>{state.hand.length}</span></MetaList>
      </div>
      {menu && (
        <div className="proto-radial" style={{ left: menu.x, top: menu.y }} onPointerDown={(e) => e.stopPropagation()}>
          <span className="proto-radial-hub" />
          {items.map(({ action, label }, i) => {
            const Icon = RADIAL_ICONS[action];
            const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
            return (
              <button key={action} type="button" title={label} onClick={() => engine.act(menu.pieceId, action)} style={{ ["--x" as string]: `${Math.cos(angle) * 78}px`, ["--y" as string]: `${Math.sin(angle) * 78}px` }}>
                <Icon /><small>{label}</small>
              </button>
            );
          })}
        </div>
      )}
      {ghost && <div className="ghost" style={{ left: ghost.x, top: ghost.y }}><ProtoCard id={ghost.cardId} faceUp /></div>}
      <StatePanel engine={engine} />
    </div>
  );
}
