"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, CircleDot, Copy, Crown, Crosshair, Eye, EyeOff, FlipHorizontal2, Hand, Heart, Layers3, Link2, LoaderCircle, LogOut, Minus, Move, Plus, Redo2, RefreshCw, RotateCcw, RotateCw, Shield, Shuffle, Sparkles, Trash2, Undo2, Users, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { HiddenGeneral, PlayingCard, PublicPlayerBoard, PublicRoom, SelectedGeneral, Suit, TableCard, TableToken, TokenColor } from "@/lib/game";
import { tamQuocSatGenerals } from "@/lib/tam-quoc-sat-generals";

declare global {
  interface Document {
    modelContext?: {
      registerTool(tool: { name: string; title?: string; description: string; inputSchema: object; annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }; execute(input: unknown): unknown | Promise<unknown> }, options?: { signal?: AbortSignal }): void | Promise<void>;
    };
  }
}

const suitSymbol: Record<Suit, string> = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" };

type SyncStatus = "connecting" | "live" | "reconnecting" | "offline";

function CardFace({ card, className = "", onClick, draggable, disabled, onDragStart, style, faceDown = false }: { card: PlayingCard; className?: string; onClick?: () => void; draggable?: boolean; disabled?: boolean; onDragStart?: React.DragEventHandler<HTMLButtonElement>; style?: React.CSSProperties; faceDown?: boolean }) {
  const red = card.suit === "hearts" || card.suit === "diamonds";
  const cardStyle = card.asset && !faceDown ? { ...style, backgroundImage: `url("${card.asset}")` } : style;
  const label = faceDown ? "Face-down card" : card.name ? `${card.name}, ${card.rank} of ${card.suit}` : `${card.rank} of ${card.suit}`;
  return (
    <button type="button" className={`playing-card ${red && !faceDown ? "card-red" : ""} ${card.asset && !faceDown ? "art-card" : ""} ${faceDown ? "card-back" : ""} ${className}`} onClick={onClick} draggable={draggable && !disabled} disabled={disabled} onDragStart={onDragStart} style={cardStyle} aria-label={label} title={faceDown ? "Face-down card" : card.name}>
      {faceDown ? <span className="card-back-mark">BB</span> : <><span className="card-corner"><b>{card.rank}</b><i>{suitSymbol[card.suit]}</i></span><span className="card-suit">{suitSymbol[card.suit]}</span><span className="card-corner card-corner-bottom"><b>{card.rank}</b><i>{suitSymbol[card.suit]}</i></span></>}
    </button>
  );
}

type CanvasSelection = { type: "card" | "token"; id: string };
type CanvasPosition = { x: number; y: number };
type CanvasDrag = CanvasSelection & { pointerId: number; startX: number; startY: number; moved: boolean; rect: DOMRect };

function canvasKey(type: CanvasSelection["type"], id: string) {
  return `${type}:${id}`;
}

function isVisibleGeneral(general: SelectedGeneral | HiddenGeneral | null): general is SelectedGeneral {
  return Boolean(general && !("hidden" in general));
}

function GeneralPortrait({ general, own, onClick }: { general: SelectedGeneral | HiddenGeneral | null; own?: boolean; onClick?: () => void }) {
  if (!general) return <button type="button" className="general-slot general-empty" onClick={onClick}><Plus /><span>Choose</span></button>;
  if (!isVisibleGeneral(general)) return <div className="general-slot general-hidden"><span>將</span><small>Hidden</small></div>;
  return (
    <button type="button" className={`general-slot faction-${general.faction} ${general.revealed ? "is-revealed" : "is-hidden"}`} onClick={onClick} disabled={!own} title={own ? `${general.revealed ? "Hide" : "Reveal"} ${general.name}` : general.name}>
      <span className="general-art" style={{ backgroundImage: `url("${general.asset}")` }} />
      <b>{general.name}</b>
      {own && <i>{general.revealed ? <Eye /> : <EyeOff />}</i>}
    </button>
  );
}

function BoardZones({ board, own, onZoneCard }: { board: PublicPlayerBoard; own?: boolean; onZoneCard?: (source: "equipment" | "judging", card: PlayingCard) => void }) {
  return (
    <div className="board-zones">
      <div><Shield /><span>Equip</span>{board.equipment.length ? board.equipment.map((card) => <button type="button" key={card.id} onClick={() => onZoneCard?.("equipment", card)} disabled={!own} title={card.name}><span style={{ backgroundImage: card.asset ? `url("${card.asset}")` : undefined }} />{card.name ?? card.rank}</button>) : <em>—</em>}</div>
      <div><Sparkles /><span>Judge</span>{board.judging.length ? board.judging.map((card) => <button type="button" key={card.id} onClick={() => onZoneCard?.("judging", card)} disabled={!own} title={card.name}><span style={{ backgroundImage: card.asset ? `url("${card.asset}")` : undefined }} />{card.name ?? card.rank}</button>) : <em>—</em>}</div>
    </div>
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
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<{ source: "equipment" | "judging"; card: PlayingCard } | null>(null);
  const [giveTargetId, setGiveTargetId] = useState("");
  const [generalsOpen, setGeneralsOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [tokenLabel, setTokenLabel] = useState("Counter");
  const [tokenColor, setTokenColor] = useState<TokenColor>("gold");
  const [selectedGeneralIds, setSelectedGeneralIds] = useState<string[]>([]);
  const [canvasSelection, setCanvasSelection] = useState<CanvasSelection | null>(null);
  const [localPositions, setLocalPositions] = useState<Record<string, CanvasPosition>>({});
  const revisionRef = useRef(0);
  const actionLockRef = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<CanvasDrag | null>(null);
  const suppressCanvasClickRef = useRef(false);

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
  const isTamQuocSat = room?.game === "tam-quoc-sat";
  const currentBoard = room?.boards[playerId];
  const selectedCard = room?.hand.find((card) => card.id === selectedCardId);
  const selectedTableCard = canvasSelection?.type === "card" ? room?.table.find((card) => card.id === canvasSelection.id) : undefined;
  const selectedToken = canvasSelection?.type === "token" ? room?.tokens.find((token) => token.id === canvasSelection.id) : undefined;
  const myTargets = room?.targets[playerId] ?? [];
  const isActing = pendingAction !== null;
  const syncLabel = syncStatus === "live" ? "Live" : syncStatus === "offline" ? "Offline" : syncStatus === "reconnecting" ? "Reconnecting" : "Connecting";

  function openGeneralPicker() {
    setSelectedGeneralIds(currentBoard?.generals.filter(isVisibleGeneral).map((general) => general.id) ?? []);
    setGeneralsOpen(true);
  }

  function toggleGeneralChoice(id: string) {
    setSelectedGeneralIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 2 ? [...current, id] : [current[1], id]);
  }

  async function moveSelected(destination: string, targetPlayerId?: string, faceDown = false) {
    if (!selectedCardId) return;
    const result = await sendAction("move-card", { cardId: selectedCardId, destination, targetPlayerId, faceDown });
    if (result) setSelectedCardId(null);
  }

  function startCanvasDrag(event: React.PointerEvent<HTMLDivElement>, selection: CanvasSelection) {
    if (event.button !== 0 || !canvasRef.current) return;
    const item = selection.type === "card" ? room?.table.find((card) => card.id === selection.id) : room?.tokens.find((token) => token.id === selection.id);
    if (!item) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { ...selection, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false, rect: canvasRef.current.getBoundingClientRect() };
  }

  function moveCanvasDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 5) return;
    drag.moved = true;
    event.preventDefault();
    const x = Math.max(4, Math.min(96, ((event.clientX - drag.rect.left) / drag.rect.width) * 100));
    const y = Math.max(4, Math.min(96, ((event.clientY - drag.rect.top) / drag.rect.height) * 100));
    setLocalPositions((current) => ({ ...current, [canvasKey(drag.type, drag.id)]: { x, y } }));
  }

  function endCanvasDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (!drag.moved) {
      suppressCanvasClickRef.current = true;
      setSelectedCardId(null);
      setSelectedZone(null);
      setCanvasSelection((current) => current?.type === drag.type && current.id === drag.id ? null : { type: drag.type, id: drag.id });
      window.setTimeout(() => { suppressCanvasClickRef.current = false; }, 0);
      return;
    }
    suppressCanvasClickRef.current = true;
    window.setTimeout(() => { suppressCanvasClickRef.current = false; }, 0);
    const key = canvasKey(drag.type, drag.id);
    const position = localPositions[key] ?? {
      x: Math.max(4, Math.min(96, ((event.clientX - drag.rect.left) / drag.rect.width) * 100)),
      y: Math.max(4, Math.min(96, ((event.clientY - drag.rect.top) / drag.rect.height) * 100)),
    };
    void sendAction("move-table-item", { itemType: drag.type, itemId: drag.id, ...position }).finally(() => {
      setLocalPositions((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    });
  }

  function selectCanvasItem(selection: CanvasSelection) {
    if (suppressCanvasClickRef.current) return;
    setSelectedCardId(null);
    setSelectedZone(null);
    setCanvasSelection((current) => current?.type === selection.type && current.id === selection.id ? null : selection);
  }

  function nudgeCanvasItem(item: TableCard | TableToken, dx: number, dy: number, type: CanvasSelection["type"]) {
    void sendAction("move-table-item", { itemType: type, itemId: item.id, x: item.x + dx, y: item.y + dy });
  }

  function dropCardOnCanvas(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    const cardId = event.dataTransfer.getData("text/card-id");
    if (!cardId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    void sendAction("play", { cardId, x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 });
  }

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

      <section className={`felt-table ${dragOver ? "is-drop-target" : ""}`} onClick={(event) => { if (event.target === event.currentTarget) setCanvasSelection(null); }}>
        <div className="player-ring" aria-label="Fixed table seating">
          {room?.players.map((player) => {
            const board = room?.boards[player.id];
            const targeted = myTargets.includes(player.id);
            const isSelf = player.id === playerId;
            return (
              <div className={`table-seat seat-${player.seat} ${isTamQuocSat ? "tam-table-seat" : ""} ${targeted ? "is-targeted" : ""} ${room?.activePlayerId === player.id ? "is-active" : ""} ${isSelf ? "is-self" : ""}`} key={player.id}>
                <button type="button" className="seat-main" onClick={() => !isSelf && isTamQuocSat && void sendAction("toggle-target", { targetPlayerId: player.id })} disabled={isActing || isSelf || !isTamQuocSat} aria-label={isSelf ? `${player.name}, your seat` : isTamQuocSat ? `${targeted ? "Remove" : "Add"} ${player.name} as target` : `${player.name}, seat ${player.seat + 1}`}>
                  <span className="player-avatar" style={{ background: player.color }}>{player.name.slice(0, 2).toUpperCase()}</span>
                  <span className="seat-name"><b>{player.name}{isSelf && <i> You</i>}</b><small>{isTamQuocSat && board && <><Heart /> {board.hp}/{board.maxHp} · </>}{room?.handCounts[player.id] ?? 0} cards</small></span>
                  {targeted && <Crosshair className="target-mark" />}
                </button>
                {isTamQuocSat && board && <div className="seat-details">
                  <div className="seat-generals">{board.generals.map((general, index) => isVisibleGeneral(general) ? <span key={index} className={`faction-${general.faction}`} style={{ backgroundImage: `url("${general.asset}")` }} title={general.name} /> : <span key={index} className="seat-general-hidden" title={general ? "Hidden general" : "No general selected"}>將</span>)}</div>
                  <div className="seat-flags">{board.chained && <span title="Chained"><Link2 /></span>}{board.faceDown && <span title="Face down"><RotateCcw /></span>}{board.equipment.length > 0 && <span title={`${board.equipment.length} equipment`}><Shield />{board.equipment.length}</span>}{board.judging.length > 0 && <span title={`${board.judging.length} delayed tricks`}><Sparkles />{board.judging.length}</span>}</div>
                </div>}
                {room?.activePlayerId === player.id && <span className="seat-turn"><Crown /> Turn</span>}
                <span className="seat-number">{player.seat + 1}</span>
              </div>
            );
          })}
          {room && room.players.length === 1 && <div className="invite-seat-hint"><Users /><span>Share the link to fill the circle</span></div>}
        </div>

        <div className="canvas-surface" ref={canvasRef} aria-label="Shared freeform tabletop canvas" onDragEnter={(event) => { event.preventDefault(); setDragOver(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { const nextTarget = event.relatedTarget; if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) setDragOver(false); }} onDrop={dropCardOnCanvas} onClick={(event) => { if (event.target === event.currentTarget) setCanvasSelection(null); }}>
          <div className="canvas-caption"><Move /><span>Shared canvas</span><small>Drag anything · no rules enforced</small></div>
          <div className="deck-area canvas-deck">
            <button type="button" className={`card-deck ${room?.game === "tam-quoc-sat" ? "tam-quoc-deck" : ""} ${pendingAction === "draw" ? "is-pending" : ""}`} onClick={() => void sendAction("draw")} disabled={isActing || !room?.deckCount} aria-label={`Draw from deck, ${room?.deckCount ?? 0} cards remaining`}><span>{room?.game === "tam-quoc-sat" ? "殺" : "BB"}</span><b>{pendingAction === "draw" ? <LoaderCircle className="sync-spinner" /> : room?.deckCount ?? 0}</b></button>
            <span>Tap deck to draw</span>
            <button type="button" className="discard-pile-button" onClick={() => setDiscardOpen(true)}><Trash2 /><span>Discard</span><b>{room?.discard.length ?? 0}</b></button>
          </div>
          {room?.table.map((card) => {
            const position = localPositions[canvasKey("card", card.id)] ?? card;
            const selected = canvasSelection?.type === "card" && canvasSelection.id === card.id;
            return <div key={`${card.id}-${card.playedAt}`} className={`canvas-item canvas-card-item ${selected ? "is-selected" : ""}`} style={{ left: `${position.x}%`, top: `${position.y}%`, zIndex: card.zIndex, "--card-rotation": `${card.rotation}deg` } as React.CSSProperties} onPointerDown={(event) => startCanvasDrag(event, { type: "card", id: card.id })} onPointerMove={moveCanvasDrag} onPointerUp={endCanvasDrag} onPointerCancel={endCanvasDrag}><CardFace card={card} faceDown={card.faceDown} className="canvas-card" onClick={() => selectCanvasItem({ type: "card", id: card.id })} /></div>;
          })}
          {room?.tokens.map((token) => {
            const position = localPositions[canvasKey("token", token.id)] ?? token;
            const selected = canvasSelection?.type === "token" && canvasSelection.id === token.id;
            return <div key={token.id} className={`canvas-item canvas-token token-${token.color} ${selected ? "is-selected" : ""}`} style={{ left: `${position.x}%`, top: `${position.y}%`, zIndex: token.zIndex }} onPointerDown={(event) => startCanvasDrag(event, { type: "token", id: token.id })} onPointerMove={moveCanvasDrag} onPointerUp={endCanvasDrag} onPointerCancel={endCanvasDrag}><button type="button" onClick={() => selectCanvasItem({ type: "token", id: token.id })} aria-label={`${token.label}, value ${token.value}`}><b>{token.value}</b><span>{token.label}</span></button></div>;
          })}
          {room && room.table.length === 0 && room.tokens.length === 0 && <div className="canvas-empty"><Hand /><b>{dragOver ? "Drop it anywhere" : "Your table, your rules"}</b><span>Play a card or add a counter, then drag it anywhere.</span></div>}
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
          <Button variant="outline" disabled={isActing} onClick={() => setTokenDialogOpen(true)}><CircleDot /> Add counter</Button>
          <Button variant="outline" disabled={!room?.isHost || isActing} onClick={() => void sendAction("shuffle")}><Shuffle className={pendingAction === "shuffle" ? "sync-spinner" : ""} /> Shuffle deck</Button>
          <Button variant="outline" disabled={isActing || (!room?.table.length && !room?.tokens.length)} onClick={() => void sendAction("clear-table")}><Trash2 className={pendingAction === "clear-table" ? "sync-spinner" : ""} /> Clear canvas</Button>
          <Button variant="ghost" disabled={!room?.isHost || isActing} onClick={() => void sendAction("reset")}><RefreshCw className={pendingAction === "reset" ? "sync-spinner" : ""} /> Reset table</Button>
        </aside>

        {(selectedTableCard || selectedToken) && <div className="canvas-action-bar" role="toolbar" aria-label={selectedTableCard ? "Selected card controls" : "Selected counter controls"}>
          <span className="canvas-selection-name"><b>{selectedTableCard ? (selectedTableCard.faceDown ? "Face-down card" : selectedTableCard.name ?? `${selectedTableCard.rank}${suitSymbol[selectedTableCard.suit]}`) : selectedToken?.label}</b><small>Tap arrows or drag to move</small></span>
          <div className="canvas-nudges" aria-label="Move selected item">
            <Button size="icon-sm" variant="ghost" aria-label="Move left" disabled={isActing} onClick={() => { const item = selectedTableCard ?? selectedToken; if (item) nudgeCanvasItem(item, -5, 0, selectedTableCard ? "card" : "token"); }}><ArrowLeft /></Button>
            <Button size="icon-sm" variant="ghost" aria-label="Move up" disabled={isActing} onClick={() => { const item = selectedTableCard ?? selectedToken; if (item) nudgeCanvasItem(item, 0, -5, selectedTableCard ? "card" : "token"); }}><ArrowUp /></Button>
            <Button size="icon-sm" variant="ghost" aria-label="Move down" disabled={isActing} onClick={() => { const item = selectedTableCard ?? selectedToken; if (item) nudgeCanvasItem(item, 0, 5, selectedTableCard ? "card" : "token"); }}><ArrowDown /></Button>
            <Button size="icon-sm" variant="ghost" aria-label="Move right" disabled={isActing} onClick={() => { const item = selectedTableCard ?? selectedToken; if (item) nudgeCanvasItem(item, 5, 0, selectedTableCard ? "card" : "token"); }}><ArrowRight /></Button>
          </div>
          {selectedTableCard && <>
            <Button size="sm" variant="outline" disabled={isActing} onClick={() => void sendAction("table-card-action", { cardId: selectedTableCard.id, cardAction: "flip" })}><FlipHorizontal2 /> Flip</Button>
            <Button size="icon-sm" variant="outline" aria-label="Rotate card left" disabled={isActing} onClick={() => void sendAction("table-card-action", { cardId: selectedTableCard.id, cardAction: "rotate-left" })}><RotateCcw /></Button>
            <Button size="icon-sm" variant="outline" aria-label="Rotate card right" disabled={isActing} onClick={() => void sendAction("table-card-action", { cardId: selectedTableCard.id, cardAction: "rotate-right" })}><RotateCw /></Button>
            <Button size="sm" variant="outline" disabled={isActing} onClick={() => void sendAction("table-card-action", { cardId: selectedTableCard.id, cardAction: "front" })}><Layers3 /> Front</Button>
            <Button size="sm" variant="outline" disabled={isActing} onClick={async () => { if (await sendAction("table-card-action", { cardId: selectedTableCard.id, cardAction: "hand" })) setCanvasSelection(null); }}><Hand /> To hand</Button>
            <Button size="icon-sm" variant="ghost" aria-label="Discard selected card" disabled={isActing} onClick={async () => { if (await sendAction("table-card-action", { cardId: selectedTableCard.id, cardAction: "discard" })) setCanvasSelection(null); }}><Trash2 /></Button>
          </>}
          {selectedToken && <>
            <Button size="icon-sm" variant="outline" aria-label="Decrease counter" disabled={isActing} onClick={() => void sendAction("adjust-token", { tokenId: selectedToken.id, delta: -1 })}><Minus /></Button>
            <strong>{selectedToken.value}</strong>
            <Button size="icon-sm" variant="outline" aria-label="Increase counter" disabled={isActing} onClick={() => void sendAction("adjust-token", { tokenId: selectedToken.id, delta: 1 })}><Plus /></Button>
            <Button size="icon-sm" variant="ghost" aria-label="Remove counter" disabled={isActing} onClick={async () => { if (await sendAction("remove-token", { tokenId: selectedToken.id })) setCanvasSelection(null); }}><Trash2 /></Button>
          </>}
          <Button size="icon-sm" variant="ghost" aria-label="Close canvas controls" onClick={() => setCanvasSelection(null)}><Undo2 /></Button>
        </div>}

        <div className="activity-line" aria-live="polite"><span className={`status-pulse ${syncStatus !== "live" ? "status-muted" : ""}`} /> {pendingAction ? "Updating the table…" : room?.lastAction ?? "Loading the table…"}</div>
        {!room && !fatalError && <div className="table-loading" role="status"><LoaderCircle className="sync-spinner" /><span>Setting the table…</span></div>}
      </section>

      <section className={`hand-dock ${isTamQuocSat ? "tam-hand-dock" : ""}`}>
        <div className="hand-meta">
          <div className="you-player"><span className="player-avatar" style={{ background: currentPlayer?.color ?? "#f4c95d" }}>{currentPlayer?.name.slice(0, 2).toUpperCase() ?? "YOU"}</span><div><b>{currentPlayer?.name ?? "Your hand"}</b><span>{room?.hand.length ?? 0} cards</span></div></div>
          {!isTamQuocSat && <p>Choose a card, then play it face-up or face-down</p>}
          {isTamQuocSat && currentBoard && (
            <div className="tam-self-board">
              <div className="self-generals">
                {currentBoard.generals.map((general, index) => <GeneralPortrait key={index} general={general} own onClick={() => general ? void sendAction("toggle-general", { slot: index }) : openGeneralPicker()} />)}
                <button type="button" className="edit-generals" onClick={openGeneralPicker}>Choose generals</button>
              </div>
              <div className="health-control" aria-label="Health controls">
                <Heart />
                <Button size="icon-sm" variant="outline" onClick={() => void sendAction("adjust-hp", { delta: -1 })} disabled={isActing || currentBoard.hp <= 0}><Minus /></Button>
                <b>{currentBoard.hp}<small>/{currentBoard.maxHp}</small></b>
                <Button size="icon-sm" variant="outline" onClick={() => void sendAction("adjust-hp", { delta: 1 })} disabled={isActing || currentBoard.hp >= currentBoard.maxHp}><Plus /></Button>
                <button type="button" className="max-hp-button" onClick={() => void sendAction("adjust-max-hp", { delta: -1 })} disabled={isActing || currentBoard.maxHp <= 1} aria-label="Decrease maximum health">− max</button>
                <button type="button" className="max-hp-button" onClick={() => void sendAction("adjust-max-hp", { delta: 1 })} disabled={isActing || currentBoard.maxHp >= 10} aria-label="Increase maximum health">+ max</button>
              </div>
              <div className="status-controls">
                <button type="button" className={currentBoard.chained ? "is-on" : ""} onClick={() => void sendAction("toggle-status", { status: "chained" })}><Link2 /> Chained</button>
                <button type="button" className={currentBoard.faceDown ? "is-on" : ""} onClick={() => void sendAction("toggle-status", { status: "faceDown" })}><RotateCcw /> Face down</button>
                <button type="button" className={room?.activePlayerId === playerId ? "is-on" : ""} onClick={() => void sendAction("set-active")}><Crown /> My turn</button>
              </div>
              <BoardZones board={currentBoard} own onZoneCard={(source, card) => { setSelectedCardId(null); setSelectedZone({ source, card }); }} />
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}><LogOut /> Leave</Button>
        </div>
        <div className="hand-cards">
          {room?.hand.map((card, index) => <CardFace key={card.id} card={card} className={`hand-card ${selectedCardId === card.id ? "is-selected" : ""}`} draggable disabled={isActing} style={{ "--hand-index": index } as React.CSSProperties} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/card-id", card.id); }} onClick={() => { setCanvasSelection(null); setSelectedZone(null); setSelectedCardId((current) => current === card.id ? null : card.id); }} />)}
          {room && room.hand.length === 0 && <button type="button" className="empty-hand" onClick={() => void sendAction("draw")} disabled={!room.deckCount || isActing}><Redo2 /><span>Your hand is empty</span><b>{pendingAction === "draw" ? "Drawing…" : "Draw a card"}</b></button>}
        </div>
        {selectedCard && (
          <div className="card-action-bar" role="toolbar" aria-label={`Actions for ${selectedCard.name ?? selectedCard.rank}`}>
            <span><b>{selectedCard.name ?? `${selectedCard.rank} of ${selectedCard.suit}`}</b><small>{selectedCard.rank}{suitSymbol[selectedCard.suit]}</small></span>
            <Button size="sm" onClick={() => void moveSelected("table")} disabled={isActing}><Hand /> Play</Button>
            <Button size="sm" variant="outline" onClick={() => void moveSelected("table", undefined, true)} disabled={isActing}><EyeOff /> Face down</Button>
            {isTamQuocSat && <Button size="sm" variant="outline" onClick={() => void moveSelected("equipment")} disabled={isActing}><Shield /> Equip</Button>}
            {isTamQuocSat && <Button size="sm" variant="outline" onClick={() => void moveSelected("judging")} disabled={isActing}><Sparkles /> Judge</Button>}
            <Button size="sm" variant="outline" onClick={() => void moveSelected("discard")} disabled={isActing}><Trash2 /> Discard</Button>
            {opponents.length > 0 && <Select value={giveTargetId} onValueChange={(value) => value && setGiveTargetId(value)}><SelectTrigger aria-label="Player to receive card"><SelectValue placeholder="Give to…" /></SelectTrigger><SelectContent>{opponents.map((player) => <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>)}</SelectContent></Select>}
            {giveTargetId && <Button size="sm" variant="outline" onClick={() => void moveSelected("player", giveTargetId)} disabled={isActing}>Give</Button>}
            <Button size="icon-sm" variant="ghost" onClick={() => setSelectedCardId(null)} aria-label="Cancel card selection"><Undo2 /></Button>
          </div>
        )}
        {isTamQuocSat && selectedZone && (
          <div className="card-action-bar" role="toolbar" aria-label={`Actions for ${selectedZone.card.name}`}>
            <span><b>{selectedZone.card.name}</b><small>{selectedZone.source}</small></span>
            <Button size="sm" onClick={async () => { if (await sendAction("move-zone-card", { source: selectedZone.source, cardId: selectedZone.card.id, destination: "hand" })) setSelectedZone(null); }}>To hand</Button>
            <Button size="sm" variant="outline" onClick={async () => { if (await sendAction("move-zone-card", { source: selectedZone.source, cardId: selectedZone.card.id, destination: "table" })) setSelectedZone(null); }}>Play</Button>
            <Button size="sm" variant="outline" onClick={async () => { if (await sendAction("move-zone-card", { source: selectedZone.source, cardId: selectedZone.card.id, destination: "discard" })) setSelectedZone(null); }}><Trash2 /> Discard</Button>
            <Button size="icon-sm" variant="ghost" onClick={() => setSelectedZone(null)} aria-label="Cancel zone selection"><Undo2 /></Button>
          </div>
        )}
      </section>

      <Dialog open={generalsOpen} onOpenChange={setGeneralsOpen}>
        <DialogContent className="generals-dialog">
          <DialogHeader><DialogTitle>Choose two generals</DialogTitle><DialogDescription>Your choices stay hidden from other players until you reveal each card.</DialogDescription></DialogHeader>
          <div className="general-roster">
            {tamQuocSatGenerals.map((general) => {
              const selectedIndex = selectedGeneralIds.indexOf(general.id);
              return <button type="button" key={general.id} className={`roster-general faction-${general.faction} ${selectedIndex >= 0 ? "is-selected" : ""}`} onClick={() => toggleGeneralChoice(general.id)}><span style={{ backgroundImage: `url("${general.asset}")` }} /><b>{general.name}</b><small>{general.faction.toUpperCase()} · {general.maxHp} HP</small>{selectedIndex >= 0 && <i>{selectedIndex + 1}</i>}</button>;
            })}
          </div>
          <div className="dialog-actions"><span>{selectedGeneralIds.length}/2 selected</span><Button onClick={async () => { if (await sendAction("set-generals", { generalIds: selectedGeneralIds })) setGeneralsOpen(false); }} disabled={selectedGeneralIds.length !== 2 || isActing}>Use these generals</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent className="discard-dialog">
          <DialogHeader><DialogTitle>Discard pile</DialogTitle><DialogDescription>All discarded and cleared cards are public. Tap a card to retrieve it when a manual effect calls for it.</DialogDescription></DialogHeader>
          <div className="discard-grid">
            {room?.discard.map((card) => <CardFace key={card.id} card={card} disabled={isActing} onClick={async () => { if (await sendAction("take-discard", { cardId: card.id })) setDiscardOpen(false); }} />)}
            {room?.discard.length === 0 && <div className="empty-discard"><Trash2 /><span>No cards have been discarded yet.</span></div>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
        <DialogContent className="token-dialog">
          <DialogHeader><DialogTitle>Add a counter</DialogTitle><DialogDescription>Use counters for health, coins, score, turns, or any rule your group invents.</DialogDescription></DialogHeader>
          <div className="token-form">
            <label htmlFor="token-label">Label</label>
            <Input id="token-label" value={tokenLabel} onChange={(event) => setTokenLabel(event.target.value)} maxLength={12} placeholder="e.g. Health" />
            <fieldset className="token-color-picker"><legend>Color</legend>{(["gold", "coral", "mint", "blue", "ink"] as TokenColor[]).map((color) => <button type="button" key={color} className={`token-swatch token-${color} ${tokenColor === color ? "is-selected" : ""}`} onClick={() => setTokenColor(color)} aria-label={`${color} counter`} aria-pressed={tokenColor === color}><span /></button>)}</fieldset>
            <Button disabled={!tokenLabel.trim() || isActing} onClick={async () => { if (await sendAction("add-token", { label: tokenLabel, color: tokenColor, x: 50 + ((room?.tokens.length ?? 0) % 4) * 5, y: 54 })) setTokenDialogOpen(false); }}><CircleDot /> Add to canvas</Button>
          </div>
        </DialogContent>
      </Dialog>

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
