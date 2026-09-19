"use client";

import { Check, ChevronDown, ChevronUp, Copy, Eye, Layers, LoaderCircle, Users, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useContext, useEffect, useMemo, useState } from "react";

import { CardInfoDialog } from "@/components/table/card-info";
import { CardStack } from "@/components/table/card-stack";
import { CarriedCard } from "@/components/table/carried-card";
import { EmptyHand } from "@/components/table/empty-hand";
import { TablePing } from "@/components/table/table-ping";
import { CounterChip } from "@/components/table/counter-chip";
import { Felt } from "@/components/table/felt";
import { FitStage } from "@/components/table/fit-stage";
import { HandTray } from "@/components/table/hand-tray";
import { HowToPlay } from "@/components/table/how-to-play";
import { RemoteHands } from "@/components/table/remote-hands";
import { CardBack, PlayingCard } from "@/components/table/playing-card";
import { SeatBadge } from "@/components/table/seat-badge";
import { SeatBoard } from "@/components/table/seat-board";
import { TablePiece } from "@/components/table/table-piece";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MetaList } from "@/components/ui/meta-list";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useStoredValue } from "@/hooks/use-hydrated";
import { useTable } from "@/hooks/use-table";
import { useTablePointer } from "@/hooks/use-table-pointer";
import { cn } from "@/lib/utils";
import { cardFace } from "@/lib/domain/deck";
import { cardKind, landingSlot, onTable, pieceKind, seatPoint, type TablePiece as Piece } from "@/lib/domain/table";

import { TakeSome } from "./take-some";
import { RoomBody } from "./room-body";
import { SelectionContext, describeSelection, type Selected } from "./selection-actions";
import { HandUtilities } from "./table-controls";
import { ClearVoteBanner, TableMenu } from "./table-menu";

export default function TableRoom() {
  const params = useParams<{ code: string }>();
  const code = String(params.code ?? "").toUpperCase();
  const { ready, seatId, table, status, pending, fatal, join, send, setAnchor, setDrag, setCarry, ping, remoteDrags, remoteCarries, pings, handsStore } = useTable(code);
  const { feltProps, pieceProps, handCardProps, counterProps, localPositions, held, lifted, carrying, takeCount, dragCardId, hoverTarget } = useTablePointer({
    send, setAnchor, setDrag, setCarry, ping,
    landing: (mover, slot, cardId) => landingSlot(table?.pieces ?? [], mover, slot, cardId),
  });
  const dropping = Boolean(held) && hoverTarget?.kind === "hand";
  const heldPiece = held ? table?.pieces.find((piece) => piece.id === held) : undefined;
  const heldKind = carrying ? cardKind(carrying.cardId) : heldPiece?.cards.length ? pieceKind(heldPiece) : null;
  const landsIn = hoverTarget?.kind === "slot" && dragCardId
    ? { seatId: hoverTarget.seatId, slot: landingSlot(table?.pieces ?? [], hoverTarget.seatId, hoverTarget.slot, dragCardId) }
    : null;
  const handCount = table?.hand.length ?? 0;
  const [selected, setSelected] = useState<Selected>(null);
  const [infoCard, setInfoCard] = useState<string | null>(null);
  const [takeFrom, setTakeFrom] = useState<string | null>(null);
  const [renamingCounter, setRenamingCounter] = useState<string | null>(null);
  const [handOpen, setHandOpen] = useState(true);
  const remoteAt = useMemo(
    () => Object.fromEntries(Object.values(remoteDrags).map((drag) => [drag.pieceId, { x: drag.x, y: drag.y }])) as Record<string, { x: number; y: number }>,
    [remoteDrags],
  );

  const storedName = useStoredValue("ban-bai:name");
  const [typedName, setTypedName] = useState<string | null>(null);
  const name = typedName ?? storedName;
  const [role, setRole] = useState<"player" | "spectator">("player");
  const [busy, setBusy] = useState(false);
  const [joinError, setJoinError] = useState("");
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
  const crowded = ringSize > 6;
  const seatPoints = useMemo(
    () => new Map(players.map((seat) => [seat.id, seatPoint(seat.index, ringSize)])),
    [players, ringSize],
  );


  async function submitJoin(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setJoinError("");
    try {
      await join(name.trim(), role);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không vào được bàn.";
      setJoinError(message);
      if (message.includes("đủ")) setRole("spectator");
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

  const myPoint = seatPoints.get(seatId) ?? { x: 0.5, y: 0.85 };
  const view = describeSelection({
    selected,
    table,
    seatId,
    home: { x: myPoint.x + (0.5 - myPoint.x) * 0.4, y: myPoint.y + (0.5 - myPoint.y) * 0.4 },
    send,
    openInfo: setInfoCard,
    openTakeSome: setTakeFrom,
    openRename: setRenamingCounter,
    clear: () => setSelected(null),
  });
  const takePiece = takeFrom ? table?.pieces.find((piece) => piece.id === takeFrom) : undefined;
  const renameTarget = renamingCounter ? table?.counters.find((counter) => counter.id === renamingCounter) : undefined;

  return (
    <SelectionContext.Provider value={{ selected, select: setSelected }}>
    <main
      className={cn(
        "grid h-svh grid-cols-[minmax(0,1fr)] overflow-hidden bg-[#0a1713] text-[#f2ede0] transition-[grid-template-rows] duration-200 [color-scheme:dark] select-none",
        handOpen ? "grid-rows-[3.25rem_minmax(0,1fr)_11rem]" : "grid-rows-[3.25rem_minmax(0,1fr)_2.75rem]",
      )}
    >
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
          <HowToPlay />
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

      <RoomBody
        view={view}
        felt={
        <FitStage seats={Math.max(table?.ringSize ?? 1, players.length)}>
        <Felt
          {...feltProps}
          onClick={(event) => {
            if (!(event.target as HTMLElement).closest("[data-piece],[data-seat],[data-slot-seat],[data-counter],[data-overlay]")) setSelected(null);
          }}
          className="size-full rounded-[11.875rem]"
        >
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
                      carrying && seat.id !== seatId
                        ? "shadow-[0_0_0_2px_var(--gilt)] hover:shadow-[0_0_0_3px_var(--gilt),0_0_1.2rem_rgba(244,201,93,0.55)]"
                        : "hover:shadow-[0_0_0_2px_var(--gilt)]",
                    )}
                  />
                  {carrying && seat.id !== seatId ? (
                    <Badge className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 bg-gilt text-[0.5rem] whitespace-nowrap text-[#17241f]">
                      đưa cho {seat.name}
                    </Badge>
                  ) : null}
                </div>
                <SeatBoard
                  seatId={seat.id}
                  self={seat.id === seatId}
                  compact={crowded}
                  dragCardId={dragCardId}
                  landing={landsIn?.seatId === seat.id ? landsIn.slot : null}
                  counters={
                    (table?.counters ?? []).filter((counter) => counter.slotted && counter.ownerId === seat.id).length ? (
                      <div className="flex gap-1">
                        {(table?.counters ?? [])
                          .filter((counter) => counter.slotted && counter.ownerId === seat.id)
                          .map((counter) => (
                            <SeatCounter key={counter.id} counter={counter} self={seat.id === seatId} send={send} counterProps={counterProps} />
                          ))}
                      </div>
                    ) : undefined
                  }
                  filled={(slot) => {
                    const piece = table?.pieces.find((item) => item.ownerId === seat.id && item.slot === slot);
                    if (!piece || !piece.cards.length || held === piece.id || remoteAt[piece.id]) return null;
                    return <SlotCard piece={piece} pieceProps={pieceProps} />;
                  }}
                />
              </div>
            );
          })}

          {table?.pieces.filter((piece) => !piece.slot || held === piece.id || remoteAt[piece.id]).map((piece) => {
            const at = localPositions[piece.id] ?? remoteAt[piece.id] ?? { x: piece.x, y: piece.y };
            return (
              <PieceOnTable
                key={piece.id}
                piece={piece}
                x={at.x}
                y={at.y}
                held={held === piece.id}
                lifted={lifted?.pieceId === piece.id}
                refusing={Boolean(heldKind) && hoverTarget?.kind === "piece" && hoverTarget.id === piece.id && !piece.slot && pieceKind(piece) !== heldKind}
                shrink={held === piece.id && hoverTarget?.kind === "slot"}
                playedBy={table?.seats.find((seat) => seat.id === piece.playedBy)}
                pieceProps={pieceProps}

              />
            );
          })}

          {table?.counters.filter((counter) => !counter.slotted).map((counter) => {
            const at = localPositions[counter.id] ?? remoteAt[counter.id] ?? { x: counter.x, y: counter.y };
            return (
              <CounterOnTable
                key={counter.id}
                counter={{ ...counter, x: at.x, y: at.y }}
                send={send}
                counterProps={counterProps}
              />
            );
          })}

          {pings.map((ping) => {
            const seat = table?.seats.find((item) => item.id === ping.seatId);
            return seat ? <TablePing key={ping.id} x={ping.x} y={ping.y} colour={seat.colour} name={seat.name} /> : null;
          })}

          {Object.entries(remoteCarries).map(([mover, carry]) => {
            const seat = table?.seats.find((item) => item.id === mover);
            if (!seat) return null;
            const inside = carry.x >= 0 && carry.x <= 1 && carry.y >= 0 && carry.y <= 1;
            const at = inside ? onTable(carry.x, carry.y) : seatPoints.get(mover) ?? { x: 0.5, y: 0.5 };
            return <CarriedCard key={mover} x={at.x} y={at.y} back={carry.back} colour={seat.colour} />;
          })}

          <RemoteHands store={handsStore} seats={table?.seats ?? []} seatPoints={seatPoints} seatId={seatId} now={now} />
          {table?.clearVote && table.clearVote.expiresAt > now ? (
            <ClearVoteBanner vote={table.clearVote} players={players.length} seatId={seatId} seats={table.seats} send={send} />
          ) : null}
        </Felt>
        </FitStage>
        }
        log={
            <ScrollArea type="auto" className="h-full min-h-0 [&_[data-slot=scroll-area-thumb]]:bg-white/20">
              <ol className="pr-3 text-[0.7rem] leading-relaxed">
                {[...(table?.log ?? [])].reverse().map((entry) => (
                  <li key={entry.id} className="border-b border-white/5 py-1 text-white/60 last:border-0">
                    <b className="font-semibold" style={{ color: table?.seats.find((seat) => seat.id === entry.actorId)?.colour ?? "var(--gilt)" }}>
                      {table?.seats.find((seat) => seat.id === entry.actorId)?.name ?? "bàn"}
                    </b>{" "}
                    {entry.text}
                  </li>
                ))}
              </ol>
            </ScrollArea>
        }
      />

      <section
        data-handzone
        data-dropping={dropping || undefined}
        onClick={(event) => { if (!(event.target as HTMLElement).closest("[data-slot=hand-card],button")) setSelected(null); }}
        className={cn(
          "relative grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] px-4 pt-3.5 transition-[box-shadow,background-image] duration-200",
          "bg-[radial-gradient(ellipse_at_50%_-40%,rgba(24,133,99,0.35),transparent_70%),linear-gradient(#06100d,#040b09)]",
          dropping && "bg-[radial-gradient(ellipse_at_50%_-10%,rgba(244,201,93,0.22),transparent_70%),linear-gradient(#0b1d17,#050d0a)] shadow-[inset_0_0_0_2px_var(--gilt)]",
        )}
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(var(--rail),var(--rail-dark))] shadow-[0_2px_6px_rgba(0,0,0,0.55)]" />
        {dropping && handCount > 0 ? (
          <span className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-gilt px-3 py-1 text-xs font-bold text-[#10201a] shadow-lg">
            Thả để cầm vào tay
          </span>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHandOpen(!handOpen)}
              className="grid size-6 place-items-center rounded-md text-white/50 hover:bg-white/10 hover:text-white"
              aria-label={handOpen ? "Thu bài trên tay" : "Mở bài trên tay"}
            >
              {handOpen ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
            </button>
            <span className="text-[0.7rem] font-semibold text-gilt-dim">{watching ? "Bạn đang xem" : "Bài trên tay"}</span>
            {watching ? null : (
              <Badge variant="secondary" className="h-5 min-w-5 justify-center border-0 bg-gilt/15 px-1.5 text-[0.65rem] text-gilt tabular-nums">
                {handCount}
              </Badge>
            )}
            {!watching && handCount > 0 && handOpen ? <span className="text-[0.68rem] text-white/40">kéo lên bàn để đánh úp, kéo bằng chuột phải để đánh ngửa</span> : null}
          </div>
          <HandUtilities watching={Boolean(watching)} send={send} seatPoint={seatPoints.get(seatId) ?? { x: 0.5, y: 0.85 }} />
        </div>
        {handOpen ? (
        <HandTray
          size="sm"
          cards={table?.hand ?? []}
          empty={<EmptyHand dropping={dropping} watching={Boolean(watching)} />}
          className="min-h-0 items-center pb-3"
          renderCard={(card) => (
            <HandCard cardId={card.id} handCardProps={handCardProps} />
          )}
        />
        ) : null}
      </section>

      {lifted && (() => {
        const piece = table?.pieces.find((item) => item.id === lifted.pieceId);
        const top = piece?.cards.at(-1);
        if (!piece || !top) return null;
        const dropping = hoverTarget?.kind === "hand";
        return (
          <div
            className={cn("pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 transition-transform duration-150", dropping ? "scale-110 rotate-[-2deg]" : "rotate-[-5deg]")}
            style={{ left: lifted.x, top: lifted.y }}
          >
            {top.faceUp ? <PlayingCard cardId={top.id} size="sm" /> : <CardBack kind={cardFace(top.id)?.kind === "general" ? "general" : "play"} size="sm" />}
            {piece.cards.length > 1 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 min-w-6 justify-center border-2 border-felt-deep tabular-nums">
                {piece.cards.length}
              </Badge>
            )}
          </div>
        );
      })()}

      {carrying && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rotate-[-4deg] transition-transform duration-150"
          style={{ left: carrying.x, top: carrying.y }}
        >
          <PlayingCard cardId={carrying.cardId} size={hoverTarget?.kind === "slot" ? "xs" : "sm"} />
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
            {joinError ? (
              <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {joinError}
              </p>
            ) : null}
            <ToggleGroup type="single" value={role} onValueChange={(value) => value && setRole(value as "player" | "spectator")} variant="outline" className="w-full">
              <ToggleGroupItem value="player" className="flex-1"><Users />Chơi</ToggleGroupItem>
              <ToggleGroupItem value="spectator" className="flex-1"><Eye />Xem</ToggleGroupItem>
            </ToggleGroup>
            <Button type="submit" disabled={busy || !name.trim()}>{busy ? <LoaderCircle className="animate-spin" /> : null}{role === "spectator" ? "Vào xem" : "Vào bàn"}</Button>
          </form>
        </DialogContent>
      </Dialog>
      {infoCard ? <CardInfoDialog cardId={infoCard} open onOpenChange={(open) => { if (!open) setInfoCard(null); }} /> : null}
      {takePiece ? <TakeSome piece={takePiece} onClose={() => setTakeFrom(null)} send={send} /> : null}
      {renameTarget ? <RenameCounter counter={renameTarget} open onOpenChange={(open) => { if (!open) setRenamingCounter(null); }} send={send} /> : null}
    </main>
    </SelectionContext.Provider>
  );
}

function HandCard({ cardId, handCardProps }: { cardId: string; handCardProps: ReturnType<typeof useTablePointer>["handCardProps"] }) {
  const { selected, select } = useContext(SelectionContext);
  const chosen = selected?.kind === "hand" && selected.cardId === cardId;
  return (
    <div {...handCardProps(cardId, () => select({ kind: "hand", cardId }))}>
      <PlayingCard cardId={cardId} size="md" className={cn("transition-transform hover:-translate-y-1", chosen && "-translate-y-4 outline-2 outline-offset-2 outline-gilt")} />
    </div>
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
  self,
  send,
  counterProps,
}: {
  counter: { id: string; label: string; value: number; x: number; y: number };
  self: boolean;
  send: ReturnType<typeof useTable>["send"];
  counterProps: ReturnType<typeof useTablePointer>["counterProps"];
}) {
  const { selected, select } = useContext(SelectionContext);
  const chosen = selected?.kind === "counter" && selected.id === counter.id;
  return (
    <div
      {...counterProps(counter, () => select({ kind: "counter", id: counter.id }))}
      onWheel={(event) => void send({ type: "adjustCounter", counterId: counter.id, delta: event.deltaY > 0 ? -1 : 1 })}
    >
      <CounterChip
        label={counter.label}
        value={counter.value}
        className={cn("shadow-none", self ? "size-11" : "size-8", chosen && "outline-2 outline-offset-2 outline-gilt")}
      />
    </div>
  );
}

function CounterOnTable({
  counter,
  send,
  counterProps,
}: {
  counter: { id: string; label: string; value: number; x: number; y: number };
  send: ReturnType<typeof useTable>["send"];
  counterProps: ReturnType<typeof useTablePointer>["counterProps"];
}) {
  const { selected, select } = useContext(SelectionContext);
  const chosen = selected?.kind === "counter" && selected.id === counter.id;
  return (
    <TablePiece
      x={counter.x}
      y={counter.y}
      {...counterProps(counter, () => select({ kind: "counter", id: counter.id }))}
      onWheel={(event) => void send({ type: "adjustCounter", counterId: counter.id, delta: event.deltaY > 0 ? -1 : 1 })}
    >
      <CounterChip label={counter.label} value={counter.value} className={cn(chosen && "outline-2 outline-offset-2 outline-gilt")} />
    </TablePiece>
  );
}

function SlotCard({
  piece,
  pieceProps,
}: {
  piece: Piece;
  pieceProps: ReturnType<typeof useTablePointer>["pieceProps"];
}) {
  const top = piece.cards[piece.cards.length - 1];
  const { selected, select } = useContext(SelectionContext);
  const chosen = selected?.kind === "piece" && selected.id === piece.id;
  return (
    <>
        <div
          {...pieceProps(piece, () => select({ kind: "piece", id: piece.id }))}
          data-slotted=""
          className="relative z-0 grid h-full w-full place-items-center p-0.5 transition-transform duration-150 hover:z-30 hover:scale-[2.4]"
        >
          <PlayingCard cardId={top.id} faceDown={!top.faceUp} size="xs" className={cn("h-full w-auto", chosen && "outline-2 outline-offset-2 outline-gilt")} />
          {piece.cards.length > 1 && (
            <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-4 min-w-4 justify-center px-1 text-[0.5rem] tabular-nums">
              {piece.cards.length}
            </Badge>
          )}
        </div>
    </>
  );
}

function PieceOnTable({
  piece,
  x,
  y,
  held,
  lifted = false,
  refusing = false,
  shrink = false,
  playedBy,
  pieceProps,
}: {
  piece: Piece;
  x: number;
  y: number;
  held: boolean;
  lifted?: boolean;
  refusing?: boolean;
  shrink?: boolean;
  playedBy?: { name: string; colour: string };
  pieceProps: ReturnType<typeof useTablePointer>["pieceProps"];
}) {
  const single = piece.cards.length === 1 && !piece.tag;
  const { selected, select } = useContext(SelectionContext);
  const chosen = selected?.kind === "piece" && selected.id === piece.id;
  return (
    <>
        <TablePiece
          x={x}
          y={y}
          rotation={piece.rotation}
          held={held}
          {...pieceProps(piece, () => select({ kind: "piece", id: piece.id }))}
          className={cn("group", lifted && "opacity-0")}
        >
          <CardStack
            cards={piece.cards}
            label={piece.label}
            size={shrink ? "xs" : "sm"}
            className={cn(
              "transition-transform duration-150 group-hover:-translate-y-0.5",
              refusing && "rounded-[7%] outline-2 outline-offset-2 outline-red-400",
              chosen && !refusing && "rounded-[7%] outline-2 outline-offset-2 outline-gilt",
            )}
          />
          {refusing ? (
            <Badge variant="destructive" className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 text-[0.55rem] whitespace-nowrap">
              {pieceKind(piece) === "general" ? "chỉ nhận lá tướng" : "không nhận lá tướng"}
            </Badge>
          ) : null}
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
    </>
  );
}
