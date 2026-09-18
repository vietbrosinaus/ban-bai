import { CardInfo, CardInfoDialog, CardInfoPeek } from "@/components/table/card-info";
import { MetaList } from "@/components/ui/meta-list";
import { CardStack } from "@/components/table/card-stack";
import { CounterChip } from "@/components/table/counter-chip";
import { Felt } from "@/components/table/felt";
import { HandTray } from "@/components/table/hand-tray";
import { PlayerCursor } from "@/components/table/player-cursor";
import { PlayingCard } from "@/components/table/playing-card";
import { SeatBadge } from "@/components/table/seat-badge";
import { TablePiece } from "@/components/table/table-piece";
import { deckOf } from "@/lib/domain/deck";
import { FACTION_LABEL, type Faction } from "@/lib/domain/card";
import type { CardRef } from "@/lib/domain/card";

const play = deckOf("tam-quoc-sat");
const generals = deckOf("generals");
const classic = deckOf("classic-52");
const refs = (ids: string[], faceUp = true): CardRef[] => ids.map((id) => ({ id, faceUp }));

function Row({ title, kind, note, children }: { title: string; kind?: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-b border-white/10 py-7">
      <div>
        <MetaList className="text-sm font-semibold text-gilt">
          <h2>{title}</h2>
          {kind ? <span className="font-normal text-white/50">{kind}</span> : null}
        </MetaList>
        {note && <p className="max-w-[70ch] text-xs text-white/50">{note}</p>}
      </div>
      <div className="flex flex-wrap items-end gap-6">{children}</div>
    </section>
  );
}

const FACTION_SAMPLE: Record<Faction, string> = { wei: "caocao", shu: "liubei", wu: "sunquan", qun: "lvbu" };

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[0.6rem] tracking-wide text-white/40 uppercase">{children}</span>;
}

export default function Primitives() {
  return (
    <main className="min-h-svh bg-[#0a1713] px-[clamp(1rem,4vw,3rem)] py-8 text-[#f2ede0]">
      <h1 className="text-xl font-bold">Bàn Bài design system</h1>
      <p className="mb-2 max-w-[70ch] text-xs text-white/50">
        Every table surface is built from these. One component per idea, variants instead of one-off CSS. If something on the table does not appear here, it does not exist.
      </p>

      <Row title="PlayingCard" kind="size" note="One aspect ratio (5:7), width-only variants. Text scales with the card, so a rank stays readable at every size.">
        {(["xs", "sm", "md", "lg"] as const).map((size) => (
          <div key={size} className="grid gap-1.5">
            <Label>{size}</Label>
            <PlayingCard cardId={play[0]} size={size} />
          </div>
        ))}
      </Row>

      <Row title="PlayingCard" kind="face and kind" note="Suit and rank sit in a chip over the art so the judgement value stays legible on every card. That is the one thing the rules read most often.">
        <div className="grid gap-1.5"><Label>play, up</Label><PlayingCard cardId={play[0]} /></div>
        <div className="grid gap-1.5"><Label>play, down</Label><PlayingCard cardId={play[0]} faceDown /></div>
        <div className="grid gap-1.5"><Label>general, up</Label><PlayingCard cardId={generals[0]} /></div>
        <div className="grid gap-1.5"><Label>general, down</Label><PlayingCard cardId={generals[0]} faceDown /></div>
        <div className="grid gap-1.5"><Label>no art</Label><PlayingCard cardId={classic[12]} /></div>
      </Row>

      <Row title="CardStack" note="A card is a stack of one, so there is no separate card component on the table.">
        <div className="grid gap-1.5"><Label>one</Label><CardStack cards={refs([play[3]])} /></div>
        <div className="grid gap-1.5"><Label>many, face down</Label><CardStack cards={refs(play.slice(0, 40), false)} label="chồng bài" /></div>
        <div className="grid gap-1.5"><Label>generals</Label><CardStack cards={refs(generals, false)} label="chồng tướng" /></div>
        <div className="grid gap-1.5"><Label>peeking</Label><CardStack cards={refs(play.slice(0, 6), false)} peeking /></div>
        <div className="grid gap-1.5"><Label>empty</Label><CardStack cards={[]} label="trống" /></div>
      </Row>

      <Row title="Felt" kind="shape" note="oval is the bird's eye table, near is the seated view, bare is a full canvas.">
        {(["oval", "near", "bare"] as const).map((shape) => (
          <div key={shape} className="grid gap-1.5">
            <Label>{shape}</Label>
            <Felt shape={shape} className="h-32 w-64" />
          </div>
        ))}
      </Row>

      <Row title="TablePiece, PlayerCursor" note="TablePiece is the only thing that knows how to place something on the felt, so no component hand-writes a percentage again.">
        <Felt className="h-56 w-[26rem]">
          <TablePiece x={0.22} y={0.35}><CardStack cards={refs(play.slice(0, 12), false)} size="sm" label="chồng bài" /></TablePiece>
          <TablePiece x={0.62} y={0.4} rotation={14}><CardStack cards={refs([play[7]])} size="sm" /></TablePiece>
          <TablePiece x={0.78} y={0.68} held><CardStack cards={refs([play[9]])} size="sm" /></TablePiece>
          <PlayerCursor x={0.45} y={0.6} colour="#ff8066" name="Minh" />
          <PlayerCursor x={0.72} y={0.62} colour="#7aa8ff" name="Huy" grabbing />
        </Felt>
      </Row>

      <Row title="HandTray" note="Your private pile. fan for the tray, flat for a strip.">
        <div className="grid gap-1.5"><Label>fan</Label><HandTray cards={refs(play.slice(20, 25))} size="sm" /></div>
        <div className="grid gap-1.5"><Label>flat</Label><HandTray cards={refs(play.slice(30, 34))} size="sm" fan={false} /></div>
        <div className="grid gap-1.5"><Label>empty</Label><HandTray cards={[]} size="sm" className="w-40" /></div>
      </Row>

      <Row title="Faction colour" note="Wei, Shu, Wu and Qun each get a ring, a stripe along the top and a dot beside the name. Three signals, so the side is readable at any size and for colour-blind players the name is always there too.">
        {(["wei", "shu", "wu", "qun"] as Faction[]).map((faction) => {
          const id = generals.find((cardId) => cardId.includes(FACTION_SAMPLE[faction])) ?? generals[0];
          return (
            <div key={faction} className="grid gap-1.5">
              <Label>{FACTION_LABEL[faction]}</Label>
              <PlayingCard cardId={id} />
            </div>
          );
        })}
        <div className="grid gap-1.5">
          <Label>small</Label>
          <div className="flex gap-1">
            {(["wei", "shu", "wu", "qun"] as Faction[]).map((faction) => (
              <PlayingCard key={faction} cardId={generals.find((cardId) => cardId.includes(FACTION_SAMPLE[faction])) ?? generals[0]} size="xs" />
            ))}
          </div>
        </div>
      </Row>

      <Row title="CardInfoDialog" kind="click a card" note="One modal for every card. A play card shows its category, its suit and number, and the rule in Vietnamese with English underneath. A general shows its faction, its HP and every skill.">
        {[play[0], play[72], generals[0], generals[16]].map((id) => (
          <CardInfoDialog key={id} cardId={id}>
            <button type="button" className="cursor-pointer rounded-lg transition-transform hover:-translate-y-1">
              <PlayingCard cardId={id} />
            </button>
          </CardInfoDialog>
        ))}
        <div className="grid gap-1.5">
          <Label>hover to peek</Label>
          <CardInfoPeek cardId={play[20]}>
            <button type="button" className="cursor-pointer"><PlayingCard cardId={play[20]} /></button>
          </CardInfoPeek>
        </div>
      </Row>

      <Row title="CardInfo" kind="the content on its own" note="The same block the modal uses, so a sheet on mobile or a sidebar can reuse it.">
        <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#fffdf7] p-5 text-[#17241f]">
          <CardInfo cardId={generals[1]} />
        </div>
      </Row>

      <Row title="SeatBadge, CounterChip" note="A counter is a number with a label and nothing else. It is what replaces HP, gold, turn order and targets.">
        <SeatBadge name="Minh" colour="#ff8066" handCount={4} seatNumber={1} />
        <SeatBadge name="Lan" colour="#65c7ba" handCount={7} seatNumber={2} distance={1} active />
        <SeatBadge name="Huy" colour="#7aa8ff" handCount={0} seatNumber={3} self />
        <CounterChip label="HP" value={4} />
        <CounterChip label="HP" value={2} colour="#ff8066" />
        <CounterChip label="vàng" value={11} colour="#65c7ba" />
      </Row>
    </main>
  );
}
