import type { Point } from "./card";

export type Anchor =
  | { kind: "point"; x: number; y: number }
  | { kind: "home" };

export type Hand = {
  seatId: string;
  anchor: Anchor;
  grabbing: boolean;
  changedAt: number;
};

export type PresenceLayout = {
  seat: (id: string) => Point | undefined;
  fallback: Point;
};

export const PRESENCE = {
  sendGapMs: 50,
  settleMs: 150,
  glideMs: 55,
  idleFadeMs: 15_000,
  goHomeMs: 45_000,
  crowdRadius: 0.02,
} as const;

export function sameAnchor(a: Anchor, b: Anchor) {
  if (a.kind === "point" && b.kind === "point") return Math.abs(a.x - b.x) < 0.004 && Math.abs(a.y - b.y) < 0.004;
  return a.kind === b.kind;
}


export function crowdOffset(rank: number, sharing: number): Point {
  if (sharing < 2) return { x: 0, y: 0 };
  const angle = (rank / sharing) * Math.PI * 2 - Math.PI / 2;
  return { x: Math.cos(angle) * PRESENCE.crowdRadius, y: Math.sin(angle) * PRESENCE.crowdRadius };
}

export function resolveAnchor(anchor: Anchor, seatId: string, layout: PresenceLayout): Point {
  if (anchor.kind === "point" && Number.isFinite(anchor.x) && Number.isFinite(anchor.y)) return { x: anchor.x, y: anchor.y };
  return layout.seat(seatId) ?? layout.fallback;
}

export function silenceOf(hand: Hand, now: number) {
  return Math.max(0, now - hand.changedAt);
}

export function handOpacity(silentMs: number) {
  if (silentMs < PRESENCE.idleFadeMs) return 1;
  if (silentMs >= PRESENCE.goHomeMs) return 0.35;
  const span = PRESENCE.goHomeMs - PRESENCE.idleFadeMs;
  return 1 - 0.6 * ((silentMs - PRESENCE.idleFadeMs) / span);
}

export function wentHome(silentMs: number) {
  return silentMs >= PRESENCE.goHomeMs;
}

export function placeHands(hands: Hand[], layout: PresenceLayout, now: number) {
  const live = hands.map((hand) => {
    const silent = silenceOf(hand, now);
    const anchor: Anchor = wentHome(silent) ? { kind: "home" } : hand.anchor;
    return { hand, anchor, silent };
  });

  const groups = new Map<string, string[]>();
  for (const { hand, anchor } of live) {
    const key = anchor.kind === "point" ? `point:${anchor.x.toFixed(2)},${anchor.y.toFixed(2)}` : `home:${hand.seatId}`;
    groups.set(key, [...(groups.get(key) ?? []), hand.seatId].sort());
  }

  return live.map(({ hand, anchor, silent }) => {
    const key = anchor.kind === "point" ? `point:${anchor.x.toFixed(2)},${anchor.y.toFixed(2)}` : `home:${hand.seatId}`;
    const group = groups.get(key) ?? [hand.seatId];
    const offset = crowdOffset(group.indexOf(hand.seatId), group.length);
    const base = resolveAnchor(anchor, hand.seatId, layout);
    return {
      seatId: hand.seatId,
      grabbing: hand.grabbing && !wentHome(silent),
      opacity: handOpacity(silent),
      x: Math.min(0.99, Math.max(0.01, base.x + offset.x)),
      y: Math.min(0.99, Math.max(0.01, base.y + offset.y)),
    };
  });
}

export function nextAnchorToSend(
  current: Anchor,
  last: { anchor: Anchor; sentAt: number } | null,
  now: number,
): Anchor | null {
  if (last && sameAnchor(current, last.anchor)) return null;
  if (last && now - last.sentAt < PRESENCE.sendGapMs) return null;
  return current;
}
