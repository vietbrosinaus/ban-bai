"use client";

import { ArrowLeft, Check, Copy, Crown, Hand, Layers3, LoaderCircle, LogOut, Redo2, RefreshCw, Shuffle, Users, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PlayingCard, PublicRoom, Suit } from "@/lib/game";

declare global {
  interface Document {
    modelContext?: {
      registerTool(tool: { name: string; title?: string; description: string; inputSchema: object; annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }; execute(input: unknown): unknown | Promise<unknown> }, options?: { signal?: AbortSignal }): void | Promise<void>;
    };
  }
}

const suitSymbol: Record<Suit, string> = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" };

type SyncStatus = "connecting" | "live" | "reconnecting" | "offline";

function CardFace({ card, className = "", onClick, draggable, disabled, onDragStart, style }: { card: PlayingCard; className?: string; onClick?: () => void; draggable?: boolean; disabled?: boolean; onDragStart?: React.DragEventHandler<HTMLButtonElement>; style?: React.CSSProperties }) {
  const red = card.suit === "hearts" || card.suit === "diamonds";
  const cardStyle = card.asset ? { ...style, backgroundImage: `url("${card.asset}")` } : style;
  const label = card.name ? `${card.name}, ${card.rank} of ${card.suit}` : `${card.rank} of ${card.suit}`;
  return (
    <button type="button" className={`playing-card ${red ? "card-red" : ""} ${card.asset ? "art-card" : ""} ${className}`} onClick={onClick} draggable={draggable && !disabled} disabled={disabled} onDragStart={onDragStart} style={cardStyle} aria-label={label} title={card.name}>
      <span className="card-corner"><b>{card.rank}</b><i>{suitSymbol[card.suit]}</i></span>
      <span className="card-suit">{suitSymbol[card.suit]}</span>
      <span className="card-corner card-corner-bottom"><b>{card.rank}</b><i>{suitSymbol[card.suit]}</i></span>
    </button>
  );
}

export default function RoomTable() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = String(params.code ?? "").toUpperCase();
  const [playerId, setPlayerId] = useState("");
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [name, setName] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [dealCount, setDealCount] = useState("4");
  const [fatalError, setFatalError] = useState("");
  const [copied, setCopied] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");
  const [dragOver, setDragOver] = useState(false);
  const revisionRef = useRef(0);
  const actionLockRef = useRef(false);

  const applyRoom = useCallback((next: PublicRoom) => {
    revisionRef.current = Math.max(revisionRef.current, next.revision);
    setRoom((current) => current && current.revision > next.revision ? current : next);
    setFatalError("");
    setSyncStatus("live");
  }, []);

  const refresh = useCallback(async (id: string, quiet = false, sinceRevision?: number, signal?: AbortSignal) => {
    try {
      const query = new URLSearchParams({ playerId: id });
      if (typeof sinceRevision === "number") query.set("since", String(sinceRevision));
      const response = await fetch(`/api/rooms/${encodeURIComponent(code)}?${query}`, { cache: "no-store", signal });
      if (response.status === 204) {
        setSyncStatus("live");
        return null;
      }
      const result = await response.json() as PublicRoom & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not load the table.");
      applyRoom(result);
      setJoinOpen(!result.players.some((player) => player.id === id));
      return result;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return null;
      setSyncStatus(navigator.onLine ? "reconnecting" : "offline");
      if (!quiet) setFatalError(error instanceof Error ? error.message : "Could not load the table.");
      return null;
    }
  }, [applyRoom, code]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPlayerId(localStorage.getItem(`ban-bai:${code}:player`) ?? "");
      setName(localStorage.getItem("ban-bai:name") ?? "");
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [code]);

  useEffect(() => {
    if (!storageReady) return;
    let stopped = false;
    let timer: number | undefined;
    let controller: AbortController | null = null;

    const schedule = (delay: number) => {
      if (!stopped) timer = window.setTimeout(poll, delay);
    };
    const poll = async () => {
      if (stopped) return;
      if (!navigator.onLine) {
        setSyncStatus("offline");
        schedule(1800);
        return;
      }
      controller = new AbortController();
      await refresh(playerId, revisionRef.current > 0, revisionRef.current || undefined, controller.signal);
      schedule(document.hidden ? 2400 : 650);
    };
    const wake = () => {
      if (timer) window.clearTimeout(timer);
      setSyncStatus(navigator.onLine ? "connecting" : "offline");
      void poll();
    };

    void poll();
    window.addEventListener("online", wake);
    window.addEventListener("offline", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      controller?.abort();
      window.removeEventListener("online", wake);
      window.removeEventListener("offline", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [playerId, refresh, storageReady]);

  async function join(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(code)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "join", name, playerId: playerId || undefined }) });
      const result = await response.json() as { playerId?: string; room?: PublicRoom; error?: string };
      if (!response.ok || !result.playerId || !result.room) throw new Error(result.error ?? "Could not join the room.");
      localStorage.setItem(`ban-bai:${code}:player`, result.playerId);
      localStorage.setItem("ban-bai:name", name.trim());
      setPlayerId(result.playerId);
      applyRoom(result.room);
      setJoinOpen(false);
      toast.success("You’re at the table.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not join the room.");
    } finally {
      setBusy(false);
    }
  }

  const sendAction = useCallback(async (action: string, data: Record<string, unknown> = {}) => {
    if (!playerId || actionLockRef.current) return null;
    actionLockRef.current = true;
    setPendingAction(action);
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(code)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, playerId, data }) });
      const result = await response.json() as PublicRoom & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The move did not go through.");
      applyRoom(result);
      if (navigator.vibrate) navigator.vibrate(18);
      return result;
    } catch (error) {
      setSyncStatus(navigator.onLine ? "reconnecting" : "offline");
      void refresh(playerId, true);
      toast.error(error instanceof Error ? error.message : "The move did not go through.");
      return null;
    } finally {
      actionLockRef.current = false;
      setPendingAction(null);
    }
  }, [applyRoom, code, playerId, refresh]);

  useEffect(() => {
    if (!playerId || !document.modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const register = document.modelContext.registerTool.bind(document.modelContext);
    void Promise.all([
      register({ name: "read_card_table", title: "Read card table", description: "Read the current visible room, players, deck count, table cards, and your hand.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: async () => await refresh(playerId) }, { signal: lifecycle.signal }),
      register({ name: "draw_card", title: "Draw a card", description: "Draw one card from the room deck into your hand.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async () => ({ success: Boolean(await sendAction("draw")) }) }, { signal: lifecycle.signal }),
      register({ name: "play_card", title: "Play a card", description: "Play one card from your hand onto the shared table using its card id.", inputSchema: { type: "object", properties: { cardId: { type: "string" } }, required: ["cardId"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async (input) => { const cardId = typeof input === "object" && input && "cardId" in input ? String((input as { cardId: unknown }).cardId) : ""; if (!cardId) throw new Error("cardId is required"); return { success: Boolean(await sendAction("play", { cardId })) }; } }, { signal: lifecycle.signal }),
    ]).catch(() => undefined);
    return () => lifecycle.abort();
  }, [code, playerId, refresh, sendAction]);

  async function copyInvite() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Invite link copied.");
    window.setTimeout(() => setCopied(false), 1600);
  }

  const currentPlayer = room?.players.find((player) => player.id === playerId);
  const opponents = useMemo(() => room?.players.filter((player) => player.id !== playerId) ?? [], [room, playerId]);
  const isActing = pendingAction !== null;
  const syncLabel = syncStatus === "live" ? "Live" : syncStatus === "offline" ? "Offline" : syncStatus === "reconnecting" ? "Reconnecting" : "Connecting";

  if (fatalError && !room) {
    return <main className="room-shell room-error"><div><Layers3 /><h1>Table unavailable</h1><p>{fatalError}</p><Button onClick={() => router.push("/")}><ArrowLeft /> Back home</Button></div></main>;
  }

  return (
    <main className="room-shell">
      <header className="room-header">
        <Link className="brand room-brand" href="/" aria-label="Bàn Bài home"><span className="brand-mark"><span>♠</span><span>♥</span></span><span>Bàn Bài</span></Link>
        <div className="room-identity">
          <span className="room-mode">{room?.game === "tam-quoc-sat" ? "Tam Quốc Sát · 108 cards" : "52-card sandbox"}</span>
          <button className="room-code" type="button" onClick={copyInvite} aria-label="Copy invite link"><span>Room</span><b>{code}</b>{copied ? <Check /> : <Copy />}</button>
          <div className={`sync-pill sync-${syncStatus}`} role="status" aria-live="polite">
            {syncStatus === "live" ? <Wifi /> : syncStatus === "offline" ? <WifiOff /> : <LoaderCircle className="sync-spinner" />}
            <span>{syncLabel}</span>
          </div>
        </div>
        <Button className="invite-button" onClick={copyInvite}><Users /> Invite friends</Button>
      </header>

      <section className={`felt-table ${dragOver ? "is-drop-target" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragOver(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { const nextTarget = event.relatedTarget; if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) setDragOver(false); }} onDrop={(event) => { event.preventDefault(); setDragOver(false); const cardId = event.dataTransfer.getData("text/card-id"); if (cardId) void sendAction("play", { cardId }); }}>
        <div className="opponent-rail">
          {opponents.map((player) => (
            <div className="opponent" key={player.id}>
              <span className="player-avatar" style={{ background: player.color }}>{player.name.slice(0, 2).toUpperCase()}</span>
              <div><b>{player.name}</b><span>{room?.handCounts[player.id] ?? 0} cards</span></div>
              <div className="mini-hand" aria-hidden="true">{Array.from({ length: Math.min(room?.handCounts[player.id] ?? 0, 5) }).map((_, index) => <i key={index} />)}</div>
            </div>
          ))}
          {room && room.players.length === 1 && <div className="empty-seat"><Users /><span>Share the room link to fill a seat</span></div>}
        </div>

        <div className="table-center">
          <div className="deck-area">
            <button type="button" className={`card-deck ${room?.game === "tam-quoc-sat" ? "tam-quoc-deck" : ""} ${pendingAction === "draw" ? "is-pending" : ""}`} onClick={() => void sendAction("draw")} disabled={isActing || !room?.deckCount} aria-label={`Draw from deck, ${room?.deckCount ?? 0} cards remaining`}><span>{room?.game === "tam-quoc-sat" ? "殺" : "BB"}</span><b>{pendingAction === "draw" ? <LoaderCircle className="sync-spinner" /> : room?.deckCount ?? 0}</b></button>
            <span>Tap deck to draw</span>
          </div>
          <div className={`play-pile ${room?.table.length ? "has-cards" : ""}`}>
            {room?.table.length ? room.table.slice(-7).map((card, index) => <CardFace key={`${card.id}-${card.playedAt}`} card={card} className="table-card" disabled={isActing} onClick={index === room.table.slice(-7).length - 1 && card.playedBy === playerId ? () => void sendAction("take-back") : undefined} />) : <div className="drop-hint"><Hand /><b>{dragOver ? "Drop to play" : "Play a card"}</b><span>Drag it here or tap from your hand</span></div>}
          </div>
        </div>

        <aside className="table-controls">
          <div className="control-title"><span>Table controls</span>{room?.isHost && <b><Crown /> Host</b>}</div>
          <div className="deal-control">
            <Select value={dealCount} onValueChange={(value) => value && setDealCount(value)}>
              <SelectTrigger aria-label="Cards per player"><SelectValue /></SelectTrigger>
              <SelectContent>{[3, 4, 5, 7, 9, 10, 13].map((count) => <SelectItem key={count} value={String(count)}>{count} cards each</SelectItem>)}</SelectContent>
            </Select>
            <Button disabled={!room?.isHost || isActing} onClick={() => void sendAction("deal", { count: Number(dealCount) })}>{pendingAction === "deal" ? <LoaderCircle className="sync-spinner" /> : "Deal"}</Button>
          </div>
          <Button variant="outline" disabled={!room?.isHost || isActing} onClick={() => void sendAction("shuffle")}><Shuffle className={pendingAction === "shuffle" ? "sync-spinner" : ""} /> Shuffle deck</Button>
          <Button variant="ghost" disabled={!room?.isHost || isActing} onClick={() => void sendAction("reset")}><RefreshCw className={pendingAction === "reset" ? "sync-spinner" : ""} /> Reset table</Button>
        </aside>

        <div className="activity-line" aria-live="polite"><span className={`status-pulse ${syncStatus !== "live" ? "status-muted" : ""}`} /> {pendingAction ? "Updating the table…" : room?.lastAction ?? "Loading the table…"}</div>
        {!room && !fatalError && <div className="table-loading" role="status"><LoaderCircle className="sync-spinner" /><span>Setting the table…</span></div>}
      </section>

      <section className="hand-dock">
        <div className="hand-meta">
          <div className="you-player"><span className="player-avatar" style={{ background: currentPlayer?.color ?? "#f4c95d" }}>{currentPlayer?.name.slice(0, 2).toUpperCase() ?? "YOU"}</span><div><b>{currentPlayer?.name ?? "Your hand"}</b><span>{room?.hand.length ?? 0} cards</span></div></div>
          <p>Drag or tap a card to play it</p>
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}><LogOut /> Leave</Button>
        </div>
        <div className="hand-cards">
          {room?.hand.map((card, index) => <CardFace key={card.id} card={card} className="hand-card" draggable disabled={isActing} style={{ "--hand-index": index } as React.CSSProperties} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/card-id", card.id); }} onClick={() => void sendAction("play", { cardId: card.id })} />)}
          {room && room.hand.length === 0 && <button type="button" className="empty-hand" onClick={() => void sendAction("draw")} disabled={!room.deckCount || isActing}><Redo2 /><span>Your hand is empty</span><b>{pendingAction === "draw" ? "Drawing…" : "Draw a card"}</b></button>}
        </div>
      </section>

      <Dialog open={joinOpen} onOpenChange={() => undefined}>
        <DialogContent className="join-dialog" showCloseButton={false}>
          <DialogHeader><DialogTitle>Take a seat</DialogTitle><DialogDescription>Enter the name your friends will see. No account or password needed.</DialogDescription></DialogHeader>
          <form onSubmit={join} className="dialog-form">
            <label htmlFor="player-name">Your name</label>
            <Input id="player-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Minh" maxLength={24} autoFocus />
            <Button type="submit" disabled={!name.trim() || busy}>{busy ? "Joining…" : "Join table"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
