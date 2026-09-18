"use client";

import { BookOpenText, Check, CircleDot, Copy, Eye, Layers, LoaderCircle, Minus, PenLine, Plus, Trash2, Users, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { CardInfoDialog } from "@/components/table/card-info";
import { CardStack } from "@/components/table/card-stack";
import { CounterChip } from "@/components/table/counter-chip";
import { Felt } from "@/components/table/felt";
import { HandTray } from "@/components/table/hand-tray";
import { PlayerCursor } from "@/components/table/player-cursor";
import { PlayingCard } from "@/components/table/playing-card";
import { SeatBadge } from "@/components/table/seat-badge";
import { SeatBoard } from "@/components/table/seat-board";
import { TablePiece } from "@/components/table/table-piece";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Dot } from "@/components/ui/dot";
import { Input } from "@/components/ui/input";
import { MetaList } from "@/components/ui/meta-list";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useStoredValue } from "@/hooks/use-hydrated";
import { useTable } from "@/hooks/use-table";
import { useTablePointer } from "@/hooks/use-table-pointer";
import { placeHands } from "@/lib/domain/presence";
import { cn } from "@/lib/utils";
import { pieceLabel, seatPoint, type TablePiece as Piece } from "@/lib/domain/table";

import { PIECE_MENU } from "./piece-menu";
import { HandUtilities } from "./table-controls";
import { ClearVoteBanner, TableMenu } from "./table-menu";

export default function TableRoom() {
  const params = useParams<{ code: string }>();
  const code = String(params.code ?? "").toUpperCase();
  const { ready, seatId, table, status, pending, fatal, join, send, setAnchor } = useTable(code);
  const { feltProps, pieceProps, handCardProps, counterProps, localPositions, held, carrying, takeCount } = useTablePointer({ send, setAnchor });

  const storedName = useStoredValue("ban-bai:name");
  const [typedName, setTypedName] = useState<string | null>(null);
  const name = typedName ?? storedName;
  const [role, setRole] = useState<"player" | "spectator">("player");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  const mySeat = table?.seats.find((seat) => seat.id === seatId);
  const seated = Boolean(mySeat);
  const watching = mySeat?.role === "spectator";

  const players = useMemo(() => (table?.seats ?? []).filter((seat) => seat.role === "player"), [table?.seats]);
  const watchers = useMemo(() => (table?.seats ?? []).filter((seat) => seat.role === "spectator"), [table?.seats]);

  const ringSize = Math.max(table?.ringSize ?? 1, players.length);
  const seatPoints = useMemo(() => {
    const anchorIndex = players.find((seat) => seat.id === seatId)?.index ?? 0;
    return new Map(players.map((seat) => [seat.id, seatPoint((seat.index - anchorIndex + ringSize) % ringSize, ringSize)]));
  }, [players, ringSize, seatId]);

  const hands = useMemo(() => {
    if (!table) return [];
    const layout = {
      piece: (id: string) => {
        const piece = table.pieces.find((item) => item.id === id);
        return piece ? localPositions[id] ?? { x: piece.x, y: piece.y } : undefined;
      },
      seat: (id: string) => seatPoints.get(id),
      fallback: { x: 0.5, y: 0.5 },
    };
    return placeHands(table.liveHands, layout, now)
      .filter((hand) => hand.seatId !== seatId)
      .map((hand) => ({ ...hand, seat: table.seats.find((seat) => seat.id === hand.seatId) }))
      .filter((hand) => Boolean(hand.seat));
  }, [localPositions, now, seatId, seatPoints, table]);

  async function submitJoin(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await join(name.trim(), role);
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (status === "missing" || fatal) {
    return (
      <main className="grid min-h-svh place-items-center bg-felt-deep p-6 text-center text-[#f2ede0]">
        <div className="grid gap-3">
          <Layers className="mx-auto size-8 text-gilt" />
          <h1 className="text-lg font-semibold">{fatal || "Bàn này không tồn tại."}</h1>
          <Button asChild variant="secondary"><Link href="/">Về trang chủ</Link></Button>
        </div>
      </main>
    );
  }

  return (
    <main className="grid h-svh grid-rows-[3.25rem_minmax(0,1fr)_12.5rem] overflow-hidden bg-[#0a1713] text-[#f2ede0] select-none">
      <header className="flex items-center gap-2.5 bg-felt-deep/70 px-4 text-sm">
        <b className="text-base">Bàn Bài</b>
        <Button variant="ghost" size="sm" onClick={copyInvite} className="tracking-widest tabular-nums">
          {copied ? <Check /> : <Copy />}{code}
        </Button>
        <div className="ml-auto flex items-center gap-4">
          {watchers.length > 0 && (
            <MetaList className="text-xs text-white/45">
              <Eye className="size-3.5" />
              <span>{watchers.length} đang xem</span>
            </MetaList>
          )}
          <Badge variant="outline" className="gap-1.5 border-white/15 text-white/60">
            {status === "live" ? <Wifi className="text-emerald-400" /> : status === "offline" ? <WifiOff className="text-red-400" /> : <LoaderCircle className="animate-spin" />}
            {status === "live" ? "trực tiếp" : status === "offline" ? "mất mạng" : "đang nối"}
          </Badge>
          {table?.isHost ? <Badge variant="secondary" className="text-[0.6rem]">chủ bàn</Badge> : null}
          <Button variant="secondary" size="sm" onClick={copyInvite}><Users />Mời bạn</Button>
          <TableMenu
            isHost={Boolean(table?.isHost)}
            watching={Boolean(watching)}
            canDeal={Boolean(table?.pieces.some((piece) => piece.tag === "deck" && piece.cards.length))}
            seatId={seatId}
            send={send}
          />
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-1 gap-3 px-3 py-3 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="grid min-h-0 place-items-center">
        <Felt {...feltProps} className="aspect-[16/10] max-h-full w-full max-w-[min(100%,72rem)]">
          {players.map((seat) => {
            const point = seatPoints.get(seat.id) ?? { x: 0.5, y: 0.5 };
            const below = point.y > 0.5;
            return (
              <div
                key={seat.id}
                className={cn(
                  "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-2xl transition-shadow",
                  below && "flex-col-reverse",
                )}
                style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
              >
                <div className="relative">
                  <SeatBadge
                    data-seat={seat.id}
                    name={seat.name}
                    colour={seat.colour}
                    handCount={table?.handCounts[seat.id] ?? 0}
                    seatNumber={seat.index + 1}
                    self={seat.id === seatId}
                    className={cn(
                      "transition-shadow",
                      carrying
                        ? "shadow-[0_0_0_2px_var(--gilt)] hover:shadow-[0_0_0_3px_var(--gilt),0_0_1.2rem_rgba(244,201,93,0.55)]"
                        : "hover:shadow-[0_0_0_2px_var(--gilt)]",
                    )}
                  />
                  {carrying ? (
                    <Badge className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 bg-gilt text-[0.5rem] whitespace-nowrap text-[#17241f]">
                      đưa vào tay
                    </Badge>
                  ) : null}
                </div>
                <SeatBoard
                  seatId={seat.id}
                  self={seat.id === seatId}
                  armed={Boolean(carrying)}
                  counters={
                    (table?.counters ?? []).filter((counter) => counter.slotted && counter.ownerId === seat.id).length ? (
                      <div className="flex gap-1">
                        {(table?.counters ?? [])
                          .filter((counter) => counter.slotted && counter.ownerId === seat.id)
                          .map((counter) => (
                            <SeatCounter key={counter.id} counter={counter} seats={players} mySeatId={seatId} self={seat.id === seatId} send={send} counterProps={counterProps} />
                          ))}
                      </div>
                    ) : undefined
                  }
                  filled={(slot) => {
                    const piece = table?.pieces.find((item) => item.ownerId === seat.id && item.slot === slot);
                    if (!piece || !piece.cards.length || held === piece.id) return null;
                    return <SlotCard piece={piece} pieceProps={pieceProps} send={send} />;
                  }}
                />
              </div>
            );
          })}

          {table?.pieces.filter((piece) => !piece.slot || held === piece.id).map((piece) => {
            const at = localPositions[piece.id] ?? { x: piece.x, y: piece.y };
            return (
              <PieceOnTable
                key={piece.id}
                piece={piece}
                x={at.x}
                y={at.y}
                held={held === piece.id}
                playedBy={table?.seats.find((seat) => seat.id === piece.playedBy)}
                pieceProps={pieceProps}
                send={send}
              />
            );
          })}

          {table?.counters.filter((counter) => !counter.slotted).map((counter) => {
            const at = localPositions[counter.id] ?? { x: counter.x, y: counter.y };
            return (
              <CounterOnTable
                key={counter.id}
                counter={{ ...counter, x: at.x, y: at.y }}
                seats={players}
                mySeatId={seatId}
                send={send}
                counterProps={counterProps}
              />
            );
          })}

          {hands.map((hand) => (
            <PlayerCursor
              key={hand.seatId}
              x={hand.x}
              y={hand.y}
              colour={hand.seat!.colour}
              name={hand.seat!.name}
              grabbing={hand.grabbing}
              style={{ opacity: hand.opacity }}
            />
          ))}
          {table?.clearVote && table.clearVote.expiresAt > now ? (
            <ClearVoteBanner vote={table.clearVote} players={players.length} seatId={seatId} seats={table.seats} send={send} />
          ) : null}
        </Felt>
        </div>

        <aside className="hidden min-h-0 xl:grid">
          <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-1.5 rounded-2xl border border-white/10 bg-felt-deep/40 p-3">
            <h2 className="text-[0.6rem] tracking-wider text-white/40 uppercase">Diễn biến</h2>
            <ol className="min-h-0 overflow-y-auto text-[0.7rem] leading-relaxed">
              {[...(table?.log ?? [])].reverse().map((entry) => (
                <li key={entry.id} className="border-b border-white/5 py-1 text-white/60 last:border-0">
                  <b className="font-semibold" style={{ color: table?.seats.find((seat) => seat.id === entry.actorId)?.colour ?? "var(--gilt)" }}>
                    {table?.seats.find((seat) => seat.id === entry.actorId)?.name ?? "bàn"}
                  </b>{" "}
                  {entry.text}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      <section data-handzone className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] border-t border-gilt/25 bg-[radial-gradient(ellipse_at_50%_-40%,rgba(24,133,99,0.35),transparent_70%),linear-gradient(#06100d,#040b09)] px-4 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <MetaList className="text-[0.68rem] text-gilt-dim">
            {watching ? <span>Bạn đang xem</span> : <span>Bài trên tay</span>}
            {watching ? <span className="text-white/40">ghế xem không cầm bài</span> : <span className="tabular-nums">{table?.hand.length ?? 0}</span>}
            {watching ? null : <span className="text-white/40">kéo lên bàn để đánh úp, giữ Shift để ngửa</span>}
          </MetaList>
          <HandUtilities watching={Boolean(watching)} send={send} seatPoint={seatPoints.get(seatId) ?? { x: 0.5, y: 0.85 }} />
        </div>
        <HandTray
          cards={table?.hand ?? []}
          empty={watching ? "người xem không cầm bài" : "tay trống, rút từ chồng bài hoặc nhờ chủ bàn chia"}
          className="min-h-0 items-center pb-3"
          renderCard={(card) => (
            <HandCard
              cardId={card.id}
              others={(table?.seats ?? []).filter((seat) => seat.role === "player" && seat.id !== seatId)}
              handCardProps={handCardProps}
              send={send}
            />
          )}
        />
      </section>

      {carrying && (
        <div className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rotate-[-4deg]" style={{ left: carrying.x, top: carrying.y }}>
          <PlayingCard cardId={carrying.cardId} size="sm" />
        </div>
      )}

      {takeCount > 0 && (
        <Badge className="pointer-events-none fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 text-base tabular-nums">{takeCount}</Badge>
      )}

      {pending && <span className="sr-only" aria-live="polite">{pending}</span>}

      <Dialog open={ready && !seated} onOpenChange={() => undefined}>
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ngồi vào bàn</DialogTitle>
            <DialogDescription>Nhập tên mà bạn bè sẽ thấy. Không cần tài khoản.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={submitJoin}>
            <Input value={name} onChange={(event) => setTypedName(event.target.value)} placeholder="Tên của bạn" maxLength={24} autoFocus />
            <ToggleGroup type="single" value={role} onValueChange={(value) => value && setRole(value as "player" | "spectator")} variant="outline" className="w-full">
              <ToggleGroupItem value="player" className="flex-1"><Users />Chơi</ToggleGroupItem>
              <ToggleGroupItem value="spectator" className="flex-1"><Eye />Xem</ToggleGroupItem>
            </ToggleGroup>
            <Button type="submit" disabled={busy || !name.trim()}>{busy ? <LoaderCircle className="animate-spin" /> : null}{role === "spectator" ? "Vào xem" : "Vào bàn"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function HandCard({
  cardId,
  others,
  handCardProps,
  send,
}: {
  cardId: string;
  others: Array<{ id: string; name: string; colour: string }>;
  handCardProps: ReturnType<typeof useTablePointer>["handCardProps"];
  send: ReturnType<typeof useTable>["send"];
}) {
  const [info, setInfo] = useState(false);
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div {...handCardProps(cardId)} onClick={() => setInfo(true)}>
            <PlayingCard cardId={cardId} className="transition-transform hover:-translate-y-1" />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onSelect={() => setInfo(true)}>
            <BookOpenText />
            Xem luật
            <ContextMenuShortcut>Nháy chuột</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuLabel className="text-[0.65rem]">Đưa cho</ContextMenuLabel>
          {others.length ? (
            others.map((seat) => (
              <ContextMenuItem key={seat.id} onSelect={() => void send({ type: "giveToSeat", cardId, seatId: seat.id })}>
                <Dot tone="solid" size="md" style={{ color: seat.colour }} />
                {seat.name}
              </ContextMenuItem>
            ))
          ) : (
            <ContextMenuItem disabled>Chưa có ai khác</ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
      <CardInfoDialog cardId={cardId} open={info} onOpenChange={setInfo} />
    </>
  );
}

function CounterMenuItems({
  counter,
  seats,
  mySeatId,
  send,
  onRename,
}: {
  counter: { id: string; label: string; value: number };
  seats: Array<{ id: string; name: string; colour: string }>;
  mySeatId: string;
  send: ReturnType<typeof useTable>["send"];
  onRename: () => void;
}) {
  return (
    <>
      <ContextMenuLabel className="flex items-center gap-2"><CircleDot className="size-3.5" />{counter.label}<Dot />{counter.value}</ContextMenuLabel>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => void send({ type: "adjustCounter", counterId: counter.id, delta: 1 })}><Plus />Tăng 1<ContextMenuShortcut>Nháy chuột</ContextMenuShortcut></ContextMenuItem>
      <ContextMenuItem onSelect={() => void send({ type: "adjustCounter", counterId: counter.id, delta: -1 })}><Minus />Giảm 1<ContextMenuShortcut>Lăn chuột</ContextMenuShortcut></ContextMenuItem>
      <ContextMenuItem onSelect={onRename}><PenLine />Đổi tên</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuLabel className="text-[0.65rem]">Gắn vào ghế</ContextMenuLabel>
      {seats.map((seat) => (
        <ContextMenuItem key={seat.id} onSelect={() => void send({ type: "slotCounter", counterId: counter.id, seatId: seat.id })}>
          <Dot tone="solid" size="md" style={{ color: seat.colour }} />
          {seat.id === mySeatId ? `${seat.name} (bạn)` : seat.name}
        </ContextMenuItem>
      ))}
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onSelect={() => void send({ type: "removeCounter", counterId: counter.id })}><Trash2 />Bỏ đi</ContextMenuItem>
    </>
  );
}

function RenameCounter({
  counter,
  open,
  onOpenChange,
  send,
}: {
  counter: { id: string; label: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  send: ReturnType<typeof useTable>["send"];
}) {
  const [label, setLabel] = useState(counter.label);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Đổi tên ô đếm</DialogTitle>
          <DialogDescription>Tên ngắn, ví dụ máu, vàng, lượt.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await send({ type: "renameCounter", counterId: counter.id, label })) onOpenChange(false);
          }}
        >
          <Input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={12} autoFocus />
          <Button type="submit">Đổi tên</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SeatCounter({
  counter,
  seats,
  mySeatId,
  self,
  send,
  counterProps,
}: {
  counter: { id: string; label: string; value: number; x: number; y: number };
  seats: Array<{ id: string; name: string; colour: string }>;
  mySeatId: string;
  self: boolean;
  send: ReturnType<typeof useTable>["send"];
  counterProps: ReturnType<typeof useTablePointer>["counterProps"];
}) {
  const [renaming, setRenaming] = useState(false);
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            {...counterProps(counter)}
            onWheel={(event) => void send({ type: "adjustCounter", counterId: counter.id, delta: event.deltaY > 0 ? -1 : 1 })}
          >
            <CounterChip
              label={counter.label}
              value={counter.value}
              className={cn("shadow-none", self ? "size-11" : "size-8")}
              onClick={() => void send({ type: "adjustCounter", counterId: counter.id, delta: 1 })}
            />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <CounterMenuItems counter={counter} seats={seats} mySeatId={mySeatId} send={send} onRename={() => setRenaming(true)} />
        </ContextMenuContent>
      </ContextMenu>
      <RenameCounter counter={counter} open={renaming} onOpenChange={setRenaming} send={send} />
    </>
  );
}

function CounterOnTable({
  counter,
  seats,
  mySeatId,
  send,
  counterProps,
}: {
  counter: { id: string; label: string; value: number; x: number; y: number };
  seats: Array<{ id: string; name: string; colour: string }>;
  mySeatId: string;
  send: ReturnType<typeof useTable>["send"];
  counterProps: ReturnType<typeof useTablePointer>["counterProps"];
}) {
  const [renaming, setRenaming] = useState(false);
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <TablePiece
            x={counter.x}
            y={counter.y}
            {...counterProps(counter)}
            onWheel={(event) => void send({ type: "adjustCounter", counterId: counter.id, delta: event.deltaY > 0 ? -1 : 1 })}
          >
            <CounterChip
              label={counter.label}
              value={counter.value}
              onClick={() => void send({ type: "adjustCounter", counterId: counter.id, delta: 1 })}
            />
          </TablePiece>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <CounterMenuItems counter={counter} seats={seats} mySeatId={mySeatId} send={send} onRename={() => setRenaming(true)} />
        </ContextMenuContent>
      </ContextMenu>
      <RenameCounter counter={counter} open={renaming} onOpenChange={setRenaming} send={send} />
    </>
  );
}

function CardShell({
  piece,
  send,
  children,
}: {
  piece: Piece;
  send: ReturnType<typeof useTable>["send"];
  children: (open: () => void) => React.ReactNode;
}) {
  const [info, setInfo] = useState(false);
  const items = PIECE_MENU.filter((item) => item.when(piece));
  const top = piece.cards[piece.cards.length - 1];
  const readable = top?.faceUp ? top.id : undefined;

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children(() => { if (readable) setInfo(true); })}</ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <ContextMenuLabel className="flex items-center gap-2">
            <Layers className="size-3.5" />
            {pieceLabel(piece)}
            <Dot />
            {piece.cards.length}
          </ContextMenuLabel>
          <ContextMenuSeparator />
          {readable ? (
            <>
              <ContextMenuItem onSelect={() => setInfo(true)}>
                <BookOpenText />
                Xem luật
                <ContextMenuShortcut>Nháy chuột</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          ) : null}
          {items.map((item) => (
            <ContextMenuItem key={item.key} onSelect={() => void send(item.command(piece))}>
              <item.icon />
              {item.label}
              {item.gesture ? <ContextMenuShortcut>{item.gesture}</ContextMenuShortcut> : null}
            </ContextMenuItem>
          ))}
        </ContextMenuContent>
      </ContextMenu>
      {readable ? <CardInfoDialog cardId={readable} open={info} onOpenChange={setInfo} /> : null}
    </>
  );
}

function SlotCard({
  piece,
  pieceProps,
  send,
}: {
  piece: Piece;
  pieceProps: ReturnType<typeof useTablePointer>["pieceProps"];
  send: ReturnType<typeof useTable>["send"];
}) {
  const top = piece.cards[piece.cards.length - 1];
  return (
    <CardShell piece={piece} send={send}>
      {(open) => (
        <div
          {...pieceProps(piece)}
          onClick={open}
          className="relative grid h-full w-full place-items-center p-0.5 transition-transform hover:-translate-y-0.5"
        >
          <PlayingCard cardId={top.id} faceDown={!top.faceUp} size="xs" className="h-full w-auto" />
          {piece.cards.length > 1 && (
            <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-4 min-w-4 justify-center px-1 text-[0.5rem] tabular-nums">
              {piece.cards.length}
            </Badge>
          )}
        </div>
      )}
    </CardShell>
  );
}

function PieceOnTable({
  piece,
  x,
  y,
  held,
  playedBy,
  pieceProps,
  send,
}: {
  piece: Piece;
  x: number;
  y: number;
  held: boolean;
  playedBy?: { name: string; colour: string };
  pieceProps: ReturnType<typeof useTablePointer>["pieceProps"];
  send: ReturnType<typeof useTable>["send"];
}) {
  const single = piece.cards.length === 1 && !piece.tag;
  return (
    <CardShell piece={piece} send={send}>
      {(open) => (
        <TablePiece
          x={x}
          y={y}
          rotation={piece.rotation}
          held={held}
          {...pieceProps(piece)}
          onClick={open}
          className="group"
        >
          <CardStack cards={piece.cards} label={piece.label} className="transition-transform group-hover:-translate-y-0.5" />
          {single && playedBy ? (
            <Badge
              variant="secondary"
              className="absolute top-full left-1/2 mt-1.5 -translate-x-1/2 border border-white/10 bg-felt-deep/85 text-[0.5rem] whitespace-nowrap"
              style={{ color: playedBy.colour }}
            >
              {playedBy.name}
            </Badge>
          ) : null}
        </TablePiece>
      )}
    </CardShell>
  );
}
