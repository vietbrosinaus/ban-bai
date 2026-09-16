"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpenText, Check, CircleDot, Copy, Crown, Crosshair, Eye, EyeOff, FlipHorizontal2, Hand, Heart, Layers3, Link2, LoaderCircle, LogOut, Minus, Move, Plus, Redo2, RefreshCw, RotateCcw, RotateCw, Shield, Shuffle, Sparkles, Trash2, Undo2, Users, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageToggle, localizeServerText, pileName, useLanguage } from "@/components/language-provider";
import type { HiddenGeneral, PlayingCard, PublicPlayerBoard, PublicRoom, SelectedGeneral, Suit, TableCard, TablePile, TableToken, TokenColor } from "@/lib/game";
import { getTamQuocSatCardInfo } from "@/lib/tam-quoc-sat";

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
  const { language, t } = useLanguage();
  const red = card.suit === "hearts" || card.suit === "diamonds";
  const cardStyle = card.asset && !faceDown ? { ...style, backgroundImage: `url("${card.asset}")` } : style;
  const suits: Record<Suit, string> = language === "vi" ? { spades: "bích", hearts: "cơ", diamonds: "rô", clubs: "tép" } : { spades: "spades", hearts: "hearts", diamonds: "diamonds", clubs: "clubs" };
  const rankLabel = t("rankOfSuit", { rank: card.rank, suit: suits[card.suit] });
  const label = faceDown ? t("faceDownCard") : card.name ? `${card.name}, ${rankLabel}` : rankLabel;
  return (
    <button type="button" className={`playing-card ${red && !faceDown ? "card-red" : ""} ${card.asset && !faceDown ? "art-card" : ""} ${faceDown ? "card-back" : ""} ${className}`} onClick={onClick} draggable={draggable && !disabled} disabled={disabled} onDragStart={onDragStart} style={cardStyle} aria-label={label} title={faceDown ? t("faceDownTitle") : card.name}>
      {faceDown ? <span className="card-back-mark">BB</span> : <><span className="card-corner"><b>{card.rank}</b><i>{suitSymbol[card.suit]}</i></span><span className="card-suit">{suitSymbol[card.suit]}</span><span className="card-corner card-corner-bottom"><b>{card.rank}</b><i>{suitSymbol[card.suit]}</i></span></>}
    </button>
  );
}

type CanvasSelection = { type: "card" | "token" | "pile"; id: string };
type CanvasPosition = { x: number; y: number };
type CanvasDrag = CanvasSelection & { pointerId: number; startX: number; startY: number; moved: boolean; rect: DOMRect; additive: boolean; groupCards: TableCard[] };
type Marquee = { pointerId: number; startX: number; startY: number; x: number; y: number };
type CanvasMenu = CanvasSelection & { x: number; y: number };

function canvasKey(type: CanvasSelection["type"], id: string) {
  return `${type}:${id}`;
}

function isVisibleGeneral(general: SelectedGeneral | HiddenGeneral | null): general is SelectedGeneral {
  return Boolean(general && !("hidden" in general));
}

function GeneralPortrait({ general, own, onClick }: { general: SelectedGeneral | HiddenGeneral | null; own?: boolean; onClick?: () => void }) {
  const { t } = useLanguage();
  if (!general) return <button type="button" className="general-slot general-empty" onClick={onClick}><Plus /><span>{t("choose")}</span></button>;
  if (!isVisibleGeneral(general)) return <div className="general-slot general-hidden"><span>將</span><small>{t("hidden")}</small></div>;
  return (
    <button type="button" className={`general-slot faction-${general.faction} ${general.revealed ? "is-revealed" : "is-hidden"}`} onClick={onClick} disabled={!own} title={own ? `${general.revealed ? t("hide") : t("reveal")} ${general.name}` : general.name}>
      <span className="general-art" style={{ backgroundImage: `url("${general.asset}")` }} />
      <b>{general.name}</b>
      {own && <i>{general.revealed ? <Eye /> : <EyeOff />}</i>}
    </button>
  );
}

function BoardZones({ board, own, onZoneCard }: { board: PublicPlayerBoard; own?: boolean; onZoneCard?: (source: "equipment" | "judging", card: PlayingCard) => void }) {
  const { t } = useLanguage();
  return (
    <div className="board-zones">
      <div><Shield /><span>{t("equip")}</span>{board.equipment.length ? board.equipment.map((card) => <button type="button" key={card.id} onClick={() => onZoneCard?.("equipment", card)} disabled={!own} title={card.name}><span style={{ backgroundImage: card.asset ? `url("${card.asset}")` : undefined }} />{card.name ?? card.rank}</button>) : <em>—</em>}</div>
      <div><Sparkles /><span>{t("judge")}</span>{board.judging.length ? board.judging.map((card) => <button type="button" key={card.id} onClick={() => onZoneCard?.("judging", card)} disabled={!own} title={card.name}><span style={{ backgroundImage: card.asset ? `url("${card.asset}")` : undefined }} />{card.name ?? card.rank}</button>) : <em>—</em>}</div>
    </div>
  );
}

export default function RoomTable() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { language, t } = useLanguage();
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
  const [inspectedCard, setInspectedCard] = useState<PlayingCard | null>(null);
  const [selectedZone, setSelectedZone] = useState<{ source: "equipment" | "judging"; card: PlayingCard } | null>(null);
  const [giveTargetId, setGiveTargetId] = useState("");
  const [generalsOpen, setGeneralsOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [tokenLabel, setTokenLabel] = useState("");
  const [tokenColor, setTokenColor] = useState<TokenColor>("gold");
  const [canvasSelection, setCanvasSelection] = useState<CanvasSelection | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [localPositions, setLocalPositions] = useState<Record<string, CanvasPosition>>({});
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const [canvasMenu, setCanvasMenu] = useState<CanvasMenu | null>(null);
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

  useEffect(() => {
    if (!canvasMenu) return;
    const close = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(".canvas-context-menu")) setCanvasMenu(null);
    };
    const closeWithKey = (event: KeyboardEvent) => { if (event.key === "Escape") setCanvasMenu(null); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", closeWithKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", closeWithKey);
    };
  }, [canvasMenu]);

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
      if (!response.ok) throw new Error(result.error ?? t("loadError"));
      applyRoom(result);
      setJoinOpen(!result.players.some((player) => player.id === id));
      return result;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return null;
      setSyncStatus(navigator.onLine ? "reconnecting" : "offline");
      if (!quiet) setFatalError(error instanceof Error ? localizeServerText(error.message, language) : t("loadError"));
      return null;
    }
  }, [applyRoom, code, language, t]);

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
      if (!response.ok || !result.playerId || !result.room) throw new Error(result.error ?? t("joinError"));
      localStorage.setItem(`ban-bai:${code}:player`, result.playerId);
      localStorage.setItem("ban-bai:name", name.trim());
      setPlayerId(result.playerId);
      applyRoom(result.room);
      setJoinOpen(false);
      toast.success(t("joined"));
    } catch (error) {
      toast.error(error instanceof Error ? localizeServerText(error.message, language) : t("joinError"));
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
      if (!response.ok) throw new Error(result.error ?? t("moveError"));
      applyRoom(result);
      if (navigator.vibrate) navigator.vibrate(18);
      return result;
    } catch (error) {
      setSyncStatus(navigator.onLine ? "reconnecting" : "offline");
      void refresh(playerId, true);
      toast.error(error instanceof Error ? localizeServerText(error.message, language) : t("moveError"));
      return null;
    } finally {
      actionLockRef.current = false;
      setPendingAction(null);
    }
  }, [applyRoom, code, language, playerId, refresh, t]);

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
    toast.success(t("copied"));
    window.setTimeout(() => setCopied(false), 1600);
  }

  const currentPlayer = room?.players.find((player) => player.id === playerId);
  const opponents = useMemo(() => room?.players.filter((player) => player.id !== playerId) ?? [], [room, playerId]);
  const isTamQuocSat = room?.game === "tam-quoc-sat";
  const currentBoard = room?.boards[playerId];
  const selectedCard = room?.hand.find((card) => card.id === selectedCardId);
  const selectedTableCards = room?.table.filter((card) => selectedCardIds.includes(card.id)) ?? [];
  const selectedTableCard = selectedTableCards[0];
  const selectedToken = canvasSelection?.type === "token" ? room?.tokens.find((token) => token.id === canvasSelection.id) : undefined;
  const selectedPile = canvasSelection?.type === "pile" ? room?.piles.find((pile) => pile.id === canvasSelection.id) : undefined;
  const contextPile = canvasMenu?.type === "pile" ? room?.piles.find((pile) => pile.id === canvasMenu.id) : undefined;
  const contextCard = canvasMenu?.type === "card" ? room?.table.find((card) => card.id === canvasMenu.id) : undefined;
  const inspectedCardInfo = getTamQuocSatCardInfo(inspectedCard?.cardType);
  const myTargets = room?.targets[playerId] ?? [];
  const isActing = pendingAction !== null;
  const syncLabel = t(syncStatus === "live" ? "live" : syncStatus);

  function openGeneralPicker() {
    setGeneralsOpen(true);
  }

  async function drawGenerals() {
    if (await sendAction("draw-generals")) toast.success(t("generalsDrawn"));
  }

  async function moveSelected(destination: string, targetPlayerId?: string, faceDown = false) {
    if (!selectedCardId) return;
    const result = await sendAction("move-card", { cardId: selectedCardId, destination, targetPlayerId, faceDown });
    if (result) setSelectedCardId(null);
  }

  function startCanvasDrag(event: React.PointerEvent<HTMLDivElement>, selection: CanvasSelection) {
    if (event.button !== 0 || !canvasRef.current) return;
    const item = selection.type === "card" ? room?.table.find((card) => card.id === selection.id) : selection.type === "pile" ? room?.piles.find((pile) => pile.id === selection.id) : room?.tokens.find((token) => token.id === selection.id);
    if (!item) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const groupCards = selection.type === "card" && selectedCardIds.includes(selection.id) ? room?.table.filter((card) => selectedCardIds.includes(card.id)) ?? [] : selection.type === "card" ? [item as TableCard] : [];
    dragRef.current = { ...selection, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false, rect: canvasRef.current.getBoundingClientRect(), additive: event.shiftKey, groupCards };
  }

  function moveCanvasDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 5) return;
    drag.moved = true;
    event.preventDefault();
    const x = Math.max(4, Math.min(96, ((event.clientX - drag.rect.left) / drag.rect.width) * 100));
    const y = Math.max(4, Math.min(96, ((event.clientY - drag.rect.top) / drag.rect.height) * 100));
    if (drag.type === "card" && drag.groupCards.length > 1) {
      const anchor = drag.groupCards.find((card) => card.id === drag.id)!;
      const dx = x - anchor.x;
      const dy = y - anchor.y;
      setLocalPositions((current) => ({ ...current, ...Object.fromEntries(drag.groupCards.map((card) => [canvasKey("card", card.id), { x: Math.max(4, Math.min(96, card.x + dx)), y: Math.max(4, Math.min(96, card.y + dy)) }])) }));
    } else setLocalPositions((current) => ({ ...current, [canvasKey(drag.type, drag.id)]: { x, y } }));
  }

  function endCanvasDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (!drag.moved) return;
    suppressCanvasClickRef.current = true;
    window.setTimeout(() => { suppressCanvasClickRef.current = false; }, 80);
    const keys = drag.type === "card" && drag.groupCards.length > 1 ? drag.groupCards.map((card) => canvasKey("card", card.id)) : [canvasKey(drag.type, drag.id)];
    const key = canvasKey(drag.type, drag.id);
    const pointerPosition = { x: Math.max(4, Math.min(96, ((event.clientX - drag.rect.left) / drag.rect.width) * 100)), y: Math.max(4, Math.min(96, ((event.clientY - drag.rect.top) / drag.rect.height) * 100)) };
    const position = localPositions[key] ?? pointerPosition;
    const anchor = drag.groupCards.find((card) => card.id === drag.id);
    const dx = anchor ? pointerPosition.x - anchor.x : 0;
    const dy = anchor ? pointerPosition.y - anchor.y : 0;
    const request = drag.type === "card" && drag.groupCards.length > 1
      ? sendAction("move-table-items", { moves: drag.groupCards.map((card) => ({ id: card.id, x: Math.max(4, Math.min(96, card.x + dx)), y: Math.max(4, Math.min(96, card.y + dy)) })) })
      : sendAction("move-table-item", { itemType: drag.type, itemId: drag.id, ...position });
    void request.finally(() => {
      setLocalPositions((current) => {
        const next = { ...current };
        keys.forEach((itemKey) => delete next[itemKey]);
        return next;
      });
    });
  }

  function selectCanvasItem(selection: CanvasSelection, additive = false) {
    if (suppressCanvasClickRef.current) return;
    setSelectedCardId(null);
    setSelectedZone(null);
    setCanvasMenu(null);
    if (selection.type === "card") {
      setSelectedCardIds((current) => additive ? current.includes(selection.id) ? current.filter((id) => id !== selection.id) : [...current, selection.id] : [selection.id]);
      setCanvasSelection(selection);
    } else {
      setSelectedCardIds([]);
      setCanvasSelection((current) => current?.type === selection.type && current.id === selection.id ? null : selection);
    }
  }

  function nudgeCanvasItem(item: TableToken | TablePile, dx: number, dy: number, type: "token" | "pile") {
    void sendAction("move-table-item", { itemType: type, itemId: item.id, x: item.x + dx, y: item.y + dy });
  }

  function nudgeSelectedCards(dx: number, dy: number) {
    void sendAction("move-table-items", { moves: selectedTableCards.map((card) => ({ id: card.id, x: card.x + dx, y: card.y + dy })) });
  }

  function startMarquee(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    event.currentTarget.setPointerCapture(event.pointerId);
    setCanvasMenu(null);
    if (!event.shiftKey) { setSelectedCardIds([]); setCanvasSelection(null); }
    setMarquee({ pointerId: event.pointerId, startX: x, startY: y, x, y });
  }

  function moveMarquee(event: React.PointerEvent<HTMLDivElement>) {
    const pointerId = event.pointerId;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    setMarquee((current) => {
      if (!current || current.pointerId !== pointerId) return current;
      return { ...current, x, y };
    });
  }

  function endMarquee(event: React.PointerEvent<HTMLDivElement>) {
    if (!marquee || marquee.pointerId !== event.pointerId) return;
    const left = Math.min(marquee.startX, marquee.x);
    const right = Math.max(marquee.startX, marquee.x);
    const top = Math.min(marquee.startY, marquee.y);
    const bottom = Math.max(marquee.startY, marquee.y);
    if (right - left > 1 || bottom - top > 1) {
      const ids = room?.table.filter((card) => card.x >= left && card.x <= right && card.y >= top && card.y <= bottom).map((card) => card.id) ?? [];
      setSelectedCardIds((current) => event.shiftKey ? [...new Set([...current, ...ids])] : ids);
      if (ids.length) setCanvasSelection({ type: "card", id: ids[0] });
    }
    setMarquee(null);
  }

  function openCanvasMenu(event: React.MouseEvent, selection: CanvasSelection) {
    event.preventDefault();
    event.stopPropagation();
    if (selection.type === "card" && !selectedCardIds.includes(selection.id)) {
      setSelectedCardIds([selection.id]);
      setCanvasSelection(selection);
    } else if (selection.type !== "card") setCanvasSelection(selection);
    setCanvasMenu({ ...selection, x: Math.min(event.clientX, window.innerWidth - 210), y: Math.min(event.clientY, window.innerHeight - 330) });
  }

  async function runCardAction(cardAction: string) {
    if (!selectedCardIds.length) return;
    if (await sendAction("table-card-action", { cardIds: selectedCardIds, cardAction })) {
      if (cardAction === "hand" || cardAction === "discard") { setSelectedCardIds([]); setCanvasSelection(null); }
      setCanvasMenu(null);
    }
  }

  async function makeSelectedPile() {
    if (selectedCardIds.length < 2) return;
    if (await sendAction("make-pile", { cardIds: selectedCardIds, faceDown: true })) {
      setSelectedCardIds([]);
      setCanvasSelection(null);
      setCanvasMenu(null);
    }
  }

  async function runPileAction(pile: TablePile, pileAction: string, extra: Record<string, unknown> = {}) {
    if (await sendAction("pile-action", { pileId: pile.id, pileAction, ...extra })) {
      if (pileAction === "spread" || pileAction === "discard" || (pileAction === "draw" && pile.cards.length === 1)) setCanvasSelection(null);
      setCanvasMenu(null);
    }
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
    return <main className="room-shell room-error"><div><LanguageToggle /><Layers3 /><h1>{t("tableUnavailable")}</h1><p>{localizeServerText(fatalError, language)}</p><Button onClick={() => router.push("/")}><ArrowLeft /> {t("backHome")}</Button></div></main>;
  }

  return (
    <main className="room-shell">
      <header className="room-header">
        <Link className="brand room-brand" href="/" aria-label={t("home")}><span className="brand-mark"><span>♠</span><span>♥</span></span><span>Bàn Bài</span></Link>
        <div className="room-identity">
          <span className="room-mode">{t(room?.game === "tam-quoc-sat" ? "tamMode" : "sandboxMode")}</span>
          <button className="room-code" type="button" onClick={copyInvite} aria-label={t("copyInvite")}><span>{t("room")}</span><b>{code}</b>{copied ? <Check /> : <Copy />}</button>
          <div className={`sync-pill sync-${syncStatus}`} role="status" aria-live="polite">
            {syncStatus === "live" ? <Wifi /> : syncStatus === "offline" ? <WifiOff /> : <LoaderCircle className="sync-spinner" />}
            <span>{syncLabel}</span>
          </div>
        </div>
        <div className="room-header-tools"><LanguageToggle compact /><Button className="invite-button" onClick={copyInvite}><Users /> {t("inviteFriends")}</Button></div>
      </header>

      <section className={`felt-table ${dragOver ? "is-drop-target" : ""}`} onClick={(event) => { if (event.target === event.currentTarget) setCanvasSelection(null); }}>
        <div className="player-ring" aria-label={t("fixedSeating")}>
          {room?.players.map((player) => {
            const board = room?.boards[player.id];
            const targeted = myTargets.includes(player.id);
            const isSelf = player.id === playerId;
            return (
              <div className={`table-seat seat-${player.seat} ${isTamQuocSat ? "tam-table-seat" : ""} ${targeted ? "is-targeted" : ""} ${room?.activePlayerId === player.id ? "is-active" : ""} ${isSelf ? "is-self" : ""}`} key={player.id}>
                <button type="button" className="seat-main" onClick={() => !isSelf && isTamQuocSat && void sendAction("toggle-target", { targetPlayerId: player.id })} disabled={isActing || isSelf || !isTamQuocSat} aria-label={isSelf ? t("yourSeat", { name: player.name }) : isTamQuocSat ? t(targeted ? "removeTarget" : "addTarget", { name: player.name }) : t("seat", { name: player.name, seat: player.seat + 1 })}>
                  <span className="player-avatar" style={{ background: player.color }}>{player.name.slice(0, 2).toUpperCase()}</span>
                  <span className="seat-name"><b>{player.name}{isSelf && <i> {t("you")}</i>}</b><small>{isTamQuocSat && board && <><Heart /> {board.hp}/{board.maxHp} · </>}{t("cards", { count: room?.handCounts[player.id] ?? 0 })}</small></span>
                  {targeted && <Crosshair className="target-mark" />}
                </button>
                {isTamQuocSat && board && <div className="seat-details">
                  <div className="seat-generals">{board.generals.map((general, index) => isVisibleGeneral(general) ? <span key={index} className={`faction-${general.faction}`} style={{ backgroundImage: `url("${general.asset}")` }} title={general.name} /> : <span key={index} className="seat-general-hidden" title={general ? t("hiddenGeneral") : t("noGeneral")}>將</span>)}</div>
                  <div className="seat-flags">{board.chained && <span title={t("chained")}><Link2 /></span>}{board.faceDown && <span title={t("faceDown")}><RotateCcw /></span>}{board.equipment.length > 0 && <span title={t("equipmentCount", { count: board.equipment.length })}><Shield />{board.equipment.length}</span>}{board.judging.length > 0 && <span title={t("delayedCount", { count: board.judging.length })}><Sparkles />{board.judging.length}</span>}</div>
                </div>}
                {room?.activePlayerId === player.id && <span className="seat-turn"><Crown /> {t("turn")}</span>}
                <span className="seat-number">{player.seat + 1}</span>
              </div>
            );
          })}
          {room && room.players.length === 1 && <div className="invite-seat-hint"><Users /><span>{t("shareCircle")}</span></div>}
        </div>

        <div className="canvas-surface" ref={canvasRef} aria-label={t("canvasAria")} onDragEnter={(event) => { event.preventDefault(); setDragOver(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { const nextTarget = event.relatedTarget; if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) setDragOver(false); }} onDrop={dropCardOnCanvas} onPointerDown={startMarquee} onPointerMove={moveMarquee} onPointerUp={endMarquee} onPointerCancel={() => setMarquee(null)} onContextMenu={(event) => { if (event.target === event.currentTarget) event.preventDefault(); }}>
          <div className="canvas-caption"><Move /><span>{t("sharedCanvas")}</span><small>{t("canvasHelp")}</small></div>
          <div className="deck-area canvas-deck">
            <button type="button" className={`card-deck ${room?.game === "tam-quoc-sat" ? "tam-quoc-deck" : ""} ${pendingAction === "draw" ? "is-pending" : ""}`} onClick={() => void sendAction("draw")} disabled={isActing || !room?.deckCount} aria-label={t("drawFromDeck", { count: room?.deckCount ?? 0 })}><span>{room?.game === "tam-quoc-sat" ? "殺" : "BB"}</span><b>{pendingAction === "draw" ? <LoaderCircle className="sync-spinner" /> : room?.deckCount ?? 0}</b></button>
            <span>{t("tapDeck")}</span>
            <button type="button" className="discard-pile-button" onClick={() => setDiscardOpen(true)}><Trash2 /><span>{t("discard")}</span><b>{room?.discard.length ?? 0}</b></button>
          </div>
          {room?.table.map((card) => {
            const position = localPositions[canvasKey("card", card.id)] ?? card;
            const selected = selectedCardIds.includes(card.id);
            return <div key={`${card.id}-${card.playedAt}`} className={`canvas-item canvas-card-item ${selected ? "is-selected" : ""}`} style={{ left: `${position.x}%`, top: `${position.y}%`, zIndex: card.zIndex, "--card-rotation": `${card.rotation}deg` } as React.CSSProperties} onPointerDown={(event) => startCanvasDrag(event, { type: "card", id: card.id })} onPointerMove={moveCanvasDrag} onPointerUp={endCanvasDrag} onPointerCancel={endCanvasDrag} onClick={(event) => selectCanvasItem({ type: "card", id: card.id }, event.shiftKey)} onContextMenu={(event) => openCanvasMenu(event, { type: "card", id: card.id })} onDoubleClick={() => void runCardAction("flip")}><CardFace card={card} faceDown={card.faceDown} className="canvas-card" /></div>;
          })}
          {room?.piles.map((pile) => {
            const position = localPositions[canvasKey("pile", pile.id)] ?? pile;
            const topCard = pile.cards.at(-1);
            const selected = canvasSelection?.type === "pile" && canvasSelection.id === pile.id;
            return <div key={pile.id} className={`canvas-item canvas-pile ${selected ? "is-selected" : ""}`} style={{ left: `${position.x}%`, top: `${position.y}%`, zIndex: pile.zIndex, "--card-rotation": `${pile.rotation}deg` } as React.CSSProperties} onPointerDown={(event) => startCanvasDrag(event, { type: "pile", id: pile.id })} onPointerMove={moveCanvasDrag} onPointerUp={endCanvasDrag} onPointerCancel={endCanvasDrag} onClick={() => selectCanvasItem({ type: "pile", id: pile.id })} onContextMenu={(event) => openCanvasMenu(event, { type: "pile", id: pile.id })} onDoubleClick={() => void runPileAction(pile, "draw")}>
              <span className="pile-layer pile-layer-two" /><span className="pile-layer pile-layer-one" />
              {topCard && <CardFace card={topCard} faceDown={pile.faceDown} className="canvas-card" />}
              <span className="pile-count">{pile.cards.length}</span><span className="pile-label">{pileName(pile.label, language)}</span>
            </div>;
          })}
          {room?.tokens.map((token) => {
            const position = localPositions[canvasKey("token", token.id)] ?? token;
            const selected = canvasSelection?.type === "token" && canvasSelection.id === token.id;
            return <div key={token.id} className={`canvas-item canvas-token token-${token.color} ${selected ? "is-selected" : ""}`} style={{ left: `${position.x}%`, top: `${position.y}%`, zIndex: token.zIndex }} onPointerDown={(event) => startCanvasDrag(event, { type: "token", id: token.id })} onPointerMove={moveCanvasDrag} onPointerUp={endCanvasDrag} onPointerCancel={endCanvasDrag} onClick={() => selectCanvasItem({ type: "token", id: token.id })}><button type="button" aria-label={t("counterValue", { label: token.label, value: token.value })}><b>{token.value}</b><span>{token.label}</span></button></div>;
          })}
          {marquee && <div className="selection-marquee" style={{ left: `${Math.min(marquee.startX, marquee.x)}%`, top: `${Math.min(marquee.startY, marquee.y)}%`, width: `${Math.abs(marquee.x - marquee.startX)}%`, height: `${Math.abs(marquee.y - marquee.startY)}%` }} />}
          {room && room.table.length === 0 && room.tokens.length === 0 && room.piles.length === 0 && <div className="canvas-empty"><Hand /><b>{t(dragOver ? "dropAnywhere" : "yourTableRules")}</b><span>{t("emptyCanvas")}</span></div>}
        </div>

        <aside className="table-controls">
          <div className="control-title"><span>{t("tableControls")}</span>{room?.isHost && <b><Crown /> {t("host")}</b>}</div>
          <div className="deal-control">
            <Select value={dealCount} onValueChange={(value) => value && setDealCount(value)}>
              <SelectTrigger aria-label={t("cardsPerPlayer")}><SelectValue /></SelectTrigger>
              <SelectContent>{[3, 4, 5, 7, 9, 10, 13].map((count) => <SelectItem key={count} value={String(count)}>{t("cardsEach", { count })}</SelectItem>)}</SelectContent>
            </Select>
            <Button disabled={!room?.isHost || isActing} onClick={() => void sendAction("deal", { count: Number(dealCount) })}>{pendingAction === "deal" ? <LoaderCircle className="sync-spinner" /> : t("deal")}</Button>
          </div>
          <Button variant="outline" disabled={isActing} onClick={() => setTokenDialogOpen(true)}><CircleDot /> {t("addCounter")}</Button>
          <Button variant="outline" disabled={!room?.isHost || isActing} onClick={() => void sendAction("shuffle")}><Shuffle className={pendingAction === "shuffle" ? "sync-spinner" : ""} /> {t("shuffleDeck")}</Button>
          <Button variant="outline" disabled={isActing || (!room?.table.length && !room?.tokens.length && !room?.piles.length)} onClick={() => void sendAction("clear-table")}><Trash2 className={pendingAction === "clear-table" ? "sync-spinner" : ""} /> {t("clearCanvas")}</Button>
          <Button variant="ghost" disabled={!room?.isHost || isActing} onClick={() => void sendAction("reset")}><RefreshCw className={pendingAction === "reset" ? "sync-spinner" : ""} /> {t("resetTable")}</Button>
        </aside>

        {(selectedTableCard || selectedToken || selectedPile) && <div className="canvas-action-bar" role="toolbar" aria-label={t(selectedTableCard ? "selectedCardControls" : selectedPile ? "selectedPileControls" : "selectedCounterControls")}>
          <span className="canvas-selection-name"><b>{selectedTableCards.length > 1 ? t("selectedCards", { count: selectedTableCards.length }) : selectedTableCard ? (selectedTableCard.faceDown ? t("faceDownCard") : selectedTableCard.name ?? `${selectedTableCard.rank}${suitSymbol[selectedTableCard.suit]}`) : selectedPile ? `${pileName(selectedPile.label, language)} · ${selectedPile.cards.length}` : selectedToken?.label}</b><small>{t(selectedTableCards.length > 1 ? "dragOrPile" : selectedPile ? "doubleClickDraw" : "arrowsOrDrag")}</small></span>
          <div className="canvas-nudges" aria-label={t("moveSelected")}>
            <Button size="icon-sm" variant="ghost" aria-label={t("moveLeft")} disabled={isActing} onClick={() => selectedTableCard ? nudgeSelectedCards(-5, 0) : selectedPile ? nudgeCanvasItem(selectedPile, -5, 0, "pile") : selectedToken && nudgeCanvasItem(selectedToken, -5, 0, "token")}><ArrowLeft /></Button>
            <Button size="icon-sm" variant="ghost" aria-label={t("moveUp")} disabled={isActing} onClick={() => selectedTableCard ? nudgeSelectedCards(0, -5) : selectedPile ? nudgeCanvasItem(selectedPile, 0, -5, "pile") : selectedToken && nudgeCanvasItem(selectedToken, 0, -5, "token")}><ArrowUp /></Button>
            <Button size="icon-sm" variant="ghost" aria-label={t("moveDown")} disabled={isActing} onClick={() => selectedTableCard ? nudgeSelectedCards(0, 5) : selectedPile ? nudgeCanvasItem(selectedPile, 0, 5, "pile") : selectedToken && nudgeCanvasItem(selectedToken, 0, 5, "token")}><ArrowDown /></Button>
            <Button size="icon-sm" variant="ghost" aria-label={t("moveRight")} disabled={isActing} onClick={() => selectedTableCard ? nudgeSelectedCards(5, 0) : selectedPile ? nudgeCanvasItem(selectedPile, 5, 0, "pile") : selectedToken && nudgeCanvasItem(selectedToken, 5, 0, "token")}><ArrowRight /></Button>
          </div>
          {selectedTableCard && <>
            {selectedTableCards.length > 1 && <Button size="sm" disabled={isActing} onClick={() => void makeSelectedPile()}><Layers3 /> {t("makePile")}</Button>}
            {selectedTableCards.length === 1 && !selectedTableCard.faceDown && getTamQuocSatCardInfo(selectedTableCard.cardType) && <Button size="sm" variant="outline" onClick={() => setInspectedCard(selectedTableCard)}><BookOpenText /> {t("viewCardRule")}</Button>}
            <Button size="sm" variant="outline" disabled={isActing} onClick={() => void runCardAction("flip")}><FlipHorizontal2 /> {t("flip")}</Button>
            <Button size="icon-sm" variant="outline" aria-label={t("rotateLeft")} disabled={isActing} onClick={() => void runCardAction("rotate-left")}><RotateCcw /></Button>
            <Button size="icon-sm" variant="outline" aria-label={t("rotateRight")} disabled={isActing} onClick={() => void runCardAction("rotate-right")}><RotateCw /></Button>
            <Button size="sm" variant="outline" disabled={isActing} onClick={() => void runCardAction("front")}><Layers3 /> {t("front")}</Button>
            <Button size="sm" variant="outline" disabled={isActing} onClick={() => void runCardAction("hand")}><Hand /> {t("toHand")}</Button>
            <Button size="icon-sm" variant="ghost" aria-label={t("discardSelected")} disabled={isActing} onClick={() => void runCardAction("discard")}><Trash2 /></Button>
          </>}
          {selectedPile && <>
            <Button size="sm" disabled={isActing} onClick={() => void runPileAction(selectedPile, "draw")}><Hand /> {t("draw")}</Button>
            <Button size="sm" variant="outline" disabled={isActing} onClick={() => void runPileAction(selectedPile, "shuffle")}><Shuffle /> {t("shuffle")}</Button>
            <Button size="sm" variant="outline" disabled={isActing} onClick={() => void runPileAction(selectedPile, "flip")}><FlipHorizontal2 /> {t("flip")}</Button>
            <Button size="sm" variant="outline" disabled={isActing} onClick={() => void runPileAction(selectedPile, "spread")}><Sparkles /> {t("spread")}</Button>
            <Button size="icon-sm" variant="ghost" aria-label={t("discardPile")} disabled={isActing} onClick={() => void runPileAction(selectedPile, "discard")}><Trash2 /></Button>
          </>}
          {selectedToken && <>
            <Button size="icon-sm" variant="outline" aria-label={t("decreaseCounter")} disabled={isActing} onClick={() => void sendAction("adjust-token", { tokenId: selectedToken.id, delta: -1 })}><Minus /></Button>
            <strong>{selectedToken.value}</strong>
            <Button size="icon-sm" variant="outline" aria-label={t("increaseCounter")} disabled={isActing} onClick={() => void sendAction("adjust-token", { tokenId: selectedToken.id, delta: 1 })}><Plus /></Button>
            <Button size="icon-sm" variant="ghost" aria-label={t("removeCounter")} disabled={isActing} onClick={async () => { if (await sendAction("remove-token", { tokenId: selectedToken.id })) setCanvasSelection(null); }}><Trash2 /></Button>
          </>}
          <Button size="icon-sm" variant="ghost" aria-label={t("closeControls")} onClick={() => { setCanvasSelection(null); setSelectedCardIds([]); }}><Undo2 /></Button>
        </div>}

        {canvasMenu && <div className="canvas-context-menu" style={{ left: canvasMenu.x, top: canvasMenu.y }} role="menu" aria-label={t(canvasMenu.type === "pile" ? "pileActions" : "cardActions")}>
          {canvasMenu.type === "card" && <><b>{selectedCardIds.length > 1 ? t("selectedCardCount", { count: selectedCardIds.length }) : t("cardActions")}</b>{selectedCardIds.length === 1 && contextCard && !contextCard.faceDown && getTamQuocSatCardInfo(contextCard.cardType) && <button type="button" role="menuitem" onClick={() => { setInspectedCard(contextCard); setCanvasMenu(null); }}><BookOpenText /> {t("viewCardRule")}</button>}{selectedCardIds.length > 1 && <button type="button" role="menuitem" onClick={() => void makeSelectedPile()}><Layers3 /> {t("makeFaceDownPile")}</button>}<button type="button" role="menuitem" onClick={() => void runCardAction("flip")}><FlipHorizontal2 /> {t("flip")}</button><button type="button" role="menuitem" onClick={() => void runCardAction("rotate-right")}><RotateCw /> {t("rotate15")}</button><button type="button" role="menuitem" onClick={() => void runCardAction("front")}><Layers3 /> {t("bringFront")}</button><button type="button" role="menuitem" onClick={() => void runCardAction("hand")}><Hand /> {t("moveMyHand")}</button><button type="button" role="menuitem" onClick={() => void runCardAction("discard")}><Trash2 /> {t("discard")}</button></>}
          {canvasMenu.type === "pile" && contextPile && <><b>{pileName(contextPile.label, language)} · {t("cards", { count: contextPile.cards.length })}</b><button type="button" role="menuitem" onClick={() => void runPileAction(contextPile, "draw")}><Hand /> {t("drawToHand")}</button><button type="button" role="menuitem" onClick={() => void runPileAction(contextPile, "play-top")}><Eye /> {t("playTop")}</button><button type="button" role="menuitem" onClick={() => void runPileAction(contextPile, "shuffle")}><Shuffle /> {t("shufflePile")}</button><button type="button" role="menuitem" onClick={() => void runPileAction(contextPile, "flip")}><FlipHorizontal2 /> {t("flipPile")}</button>{selectedCardIds.length > 0 && <button type="button" role="menuitem" onClick={async () => { if (await sendAction("add-cards-to-pile", { pileId: contextPile.id, cardIds: selectedCardIds })) { setSelectedCardIds([]); setCanvasMenu(null); } }}><Plus /> {t("addSelected")}</button>}<button type="button" role="menuitem" onClick={() => void runPileAction(contextPile, "spread")}><Sparkles /> {t("spreadCards")}</button><button type="button" role="menuitem" onClick={() => void runPileAction(contextPile, "discard")}><Trash2 /> {t("discardPile")}</button></>}
        </div>}

        <div className="activity-line" aria-live="polite"><span className={`status-pulse ${syncStatus !== "live" ? "status-muted" : ""}`} /> {pendingAction ? t("updatingTable") : room?.lastAction ? localizeServerText(room.lastAction, language) : t("loadingTable")}</div>
        {!room && !fatalError && <div className="table-loading" role="status"><LoaderCircle className="sync-spinner" /><span>{t("settingTable")}</span></div>}
      </section>

      <section className={`hand-dock ${isTamQuocSat ? "tam-hand-dock" : ""}`}>
        <div className="hand-meta">
          <div className="you-player"><span className="player-avatar" style={{ background: currentPlayer?.color ?? "#f4c95d" }}>{currentPlayer?.name.slice(0, 2).toUpperCase() ?? (language === "vi" ? "BẠN" : "YOU")}</span><div><b>{currentPlayer?.name ?? t("yourHand")}</b><span>{t("cards", { count: room?.hand.length ?? 0 })}</span></div></div>
          {!isTamQuocSat && <p>{t("handHint")}</p>}
          {isTamQuocSat && currentBoard && (
            <div className="tam-self-board">
              <div className="self-generals">
                {currentBoard.generals.map((general, index) => <GeneralPortrait key={index} general={general} own onClick={() => general ? void sendAction("toggle-general", { slot: index }) : openGeneralPicker()} />)}
                <button type="button" className="edit-generals" onClick={openGeneralPicker}>{t(currentBoard.generals.some(isVisibleGeneral) ? "redrawGenerals" : "chooseGenerals")}</button>
              </div>
              <div className="health-control" aria-label={t("healthControls")}>
                <Heart />
                <Button size="icon-sm" variant="outline" onClick={() => void sendAction("adjust-hp", { delta: -1 })} disabled={isActing || currentBoard.hp <= 0}><Minus /></Button>
                <b>{currentBoard.hp}<small>/{currentBoard.maxHp}</small></b>
                <Button size="icon-sm" variant="outline" onClick={() => void sendAction("adjust-hp", { delta: 1 })} disabled={isActing || currentBoard.hp >= currentBoard.maxHp}><Plus /></Button>
                <button type="button" className="max-hp-button" onClick={() => void sendAction("adjust-max-hp", { delta: -1 })} disabled={isActing || currentBoard.maxHp <= 1} aria-label={t("decreaseMaxHp")}>− {t("max")}</button>
                <button type="button" className="max-hp-button" onClick={() => void sendAction("adjust-max-hp", { delta: 1 })} disabled={isActing || currentBoard.maxHp >= 10} aria-label={t("increaseMaxHp")}>+ {t("max")}</button>
              </div>
              <div className="status-controls">
                <button type="button" className={currentBoard.chained ? "is-on" : ""} onClick={() => void sendAction("toggle-status", { status: "chained" })}><Link2 /> {t("chained")}</button>
                <button type="button" className={currentBoard.faceDown ? "is-on" : ""} onClick={() => void sendAction("toggle-status", { status: "faceDown" })}><RotateCcw /> {t("faceDown")}</button>
                <button type="button" className={room?.activePlayerId === playerId ? "is-on" : ""} onClick={() => void sendAction("set-active")}><Crown /> {t("myTurn")}</button>
              </div>
              <BoardZones board={currentBoard} own onZoneCard={(source, card) => { setSelectedCardId(null); setSelectedZone({ source, card }); }} />
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}><LogOut /> {t("leave")}</Button>
        </div>
        <div className="hand-cards">
          {room?.hand.map((card, index) => <CardFace key={card.id} card={card} className={`hand-card ${selectedCardId === card.id ? "is-selected" : ""}`} draggable disabled={isActing} style={{ "--hand-index": index } as React.CSSProperties} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/card-id", card.id); }} onClick={() => { setCanvasSelection(null); setSelectedZone(null); setSelectedCardId((current) => current === card.id ? null : card.id); }} />)}
          {room && room.hand.length === 0 && <button type="button" className="empty-hand" onClick={() => void sendAction("draw")} disabled={!room.deckCount || isActing}><Redo2 /><span>{t("handEmpty")}</span><b>{pendingAction === "draw" ? t("drawing") : t("drawCard")}</b></button>}
        </div>
        {selectedCard && (
          <div className="card-action-bar" role="toolbar" aria-label={t("actionsFor", { name: selectedCard.name ?? selectedCard.rank })}>
            <span><b>{selectedCard.name ?? `${selectedCard.rank}${suitSymbol[selectedCard.suit]}`}</b><small>{selectedCard.rank}{suitSymbol[selectedCard.suit]}</small></span>
            {getTamQuocSatCardInfo(selectedCard.cardType) && <Button size="sm" variant="outline" onClick={() => setInspectedCard(selectedCard)}><BookOpenText /> {t("viewCardRule")}</Button>}
            <Button size="sm" onClick={() => void moveSelected("table")} disabled={isActing}><Hand /> {t("play")}</Button>
            <Button size="sm" variant="outline" onClick={() => void moveSelected("table", undefined, true)} disabled={isActing}><EyeOff /> {t("faceDown")}</Button>
            {isTamQuocSat && <Button size="sm" variant="outline" onClick={() => void moveSelected("equipment")} disabled={isActing}><Shield /> {t("equip")}</Button>}
            {isTamQuocSat && <Button size="sm" variant="outline" onClick={() => void moveSelected("judging")} disabled={isActing}><Sparkles /> {t("judge")}</Button>}
            <Button size="sm" variant="outline" onClick={() => void moveSelected("discard")} disabled={isActing}><Trash2 /> {t("discard")}</Button>
            {opponents.length > 0 && <Select value={giveTargetId} onValueChange={(value) => value && setGiveTargetId(value)}><SelectTrigger aria-label={t("giveTo")}><SelectValue placeholder={t("giveTo")} /></SelectTrigger><SelectContent>{opponents.map((player) => <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>)}</SelectContent></Select>}
            {giveTargetId && <Button size="sm" variant="outline" onClick={() => void moveSelected("player", giveTargetId)} disabled={isActing}>{t("give")}</Button>}
            <Button size="icon-sm" variant="ghost" onClick={() => setSelectedCardId(null)} aria-label={t("cancelSelection")}><Undo2 /></Button>
          </div>
        )}
        {isTamQuocSat && selectedZone && (
          <div className="card-action-bar" role="toolbar" aria-label={t("actionsFor", { name: selectedZone.card.name ?? selectedZone.card.rank })}>
            <span><b>{selectedZone.card.name}</b><small>{t(selectedZone.source === "equipment" ? "equipZone" : "judgeZone")}</small></span>
            {getTamQuocSatCardInfo(selectedZone.card.cardType) && <Button size="sm" variant="outline" onClick={() => setInspectedCard(selectedZone.card)}><BookOpenText /> {t("viewCardRule")}</Button>}
            <Button size="sm" onClick={async () => { if (await sendAction("move-zone-card", { source: selectedZone.source, cardId: selectedZone.card.id, destination: "hand" })) setSelectedZone(null); }}>{t("toHand")}</Button>
            <Button size="sm" variant="outline" onClick={async () => { if (await sendAction("move-zone-card", { source: selectedZone.source, cardId: selectedZone.card.id, destination: "table" })) setSelectedZone(null); }}>{t("play")}</Button>
            <Button size="sm" variant="outline" onClick={async () => { if (await sendAction("move-zone-card", { source: selectedZone.source, cardId: selectedZone.card.id, destination: "discard" })) setSelectedZone(null); }}><Trash2 /> {t("discard")}</Button>
            <Button size="icon-sm" variant="ghost" onClick={() => setSelectedZone(null)} aria-label={t("cancelZone")}><Undo2 /></Button>
          </div>
        )}
      </section>

      <Dialog open={generalsOpen} onOpenChange={setGeneralsOpen}>
        <DialogContent className="generals-dialog">
          <DialogHeader><DialogTitle>{t("randomGeneralTitle")}</DialogTitle><DialogDescription>{t("generalsDescription")}</DialogDescription></DialogHeader>
          <div className="random-general-cards" aria-live="polite">
            {(currentBoard?.generals ?? [null, null]).map((general, index) => isVisibleGeneral(general) ? (
              <div key={general.id} className={`random-general-card faction-${general.faction}`}>
                <span style={{ backgroundImage: `url("${general.asset}")` }} />
                <b>{general.name}</b>
                <small>{general.faction.toUpperCase()} · {general.maxHp} {t("hp")}</small>
              </div>
            ) : (
              <div key={index} className="random-general-back" aria-label={t("hiddenGeneral")}><span>將</span><small>{t("hidden")}</small></div>
            ))}
          </div>
          <p className="random-general-note">{t("redrawHint")}</p>
          <div className="dialog-actions"><Button onClick={() => void drawGenerals()} disabled={isActing}>{pendingAction === "draw-generals" ? <LoaderCircle className="spin" /> : <Shuffle />}{t(currentBoard?.generals.some(isVisibleGeneral) ? "redrawGenerals" : "drawTwoGenerals")}</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(inspectedCard && inspectedCardInfo)} onOpenChange={(open) => { if (!open) setInspectedCard(null); }}>
        {inspectedCard && inspectedCardInfo && <DialogContent className="card-rule-dialog">
          <div className="card-rule-layout">
            <div className="card-rule-preview" style={{ backgroundImage: inspectedCard.asset ? `url("${inspectedCard.asset}")` : undefined }} role="img" aria-label={inspectedCard.name} />
            <div className="card-rule-copy">
              <span className="card-rule-category">{t(`cardCategory_${inspectedCardInfo.category}`)}</span>
              <DialogHeader><DialogTitle>{inspectedCard.name}</DialogTitle><DialogDescription>{inspectedCardInfo.nameEn} · {inspectedCard.rank}{suitSymbol[inspectedCard.suit]}</DialogDescription></DialogHeader>
              <div className="card-rule-text"><BookOpenText /><div><b>{t("cardRule")}</b><p>{language === "vi" ? inspectedCardInfo.ruleVi : inspectedCardInfo.ruleEn}</p></div></div>
              <p className="card-rule-note">{t("cardRuleNote")}</p>
            </div>
          </div>
        </DialogContent>}
      </Dialog>

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent className="discard-dialog">
          <DialogHeader><DialogTitle>{t("discardTitle")}</DialogTitle><DialogDescription>{t("discardDescription")}</DialogDescription></DialogHeader>
          <div className="discard-grid">
            {room?.discard.map((card) => <CardFace key={card.id} card={card} disabled={isActing} onClick={async () => { if (await sendAction("take-discard", { cardId: card.id })) setDiscardOpen(false); }} />)}
            {room?.discard.length === 0 && <div className="empty-discard"><Trash2 /><span>{t("noDiscard")}</span></div>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
        <DialogContent className="token-dialog">
          <DialogHeader><DialogTitle>{t("addCounter")}</DialogTitle><DialogDescription>{t("counterDescription")}</DialogDescription></DialogHeader>
          <div className="token-form">
            <label htmlFor="token-label">{t("label")}</label>
            <Input id="token-label" value={tokenLabel} onChange={(event) => setTokenLabel(event.target.value)} maxLength={12} placeholder={t("counterPlaceholder")} />
            <fieldset className="token-color-picker"><legend>{t("color")}</legend>{(["gold", "coral", "mint", "blue", "ink"] as TokenColor[]).map((color) => <button type="button" key={color} className={`token-swatch token-${color} ${tokenColor === color ? "is-selected" : ""}`} onClick={() => setTokenColor(color)} aria-label={t("colorCounter", { color })} aria-pressed={tokenColor === color}><span /></button>)}</fieldset>
            <Button disabled={!tokenLabel.trim() || isActing} onClick={async () => { if (await sendAction("add-token", { label: tokenLabel, color: tokenColor, x: 50 + ((room?.tokens.length ?? 0) % 4) * 5, y: 54 })) setTokenDialogOpen(false); }}><CircleDot /> {t("addToCanvas")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={joinOpen} onOpenChange={() => undefined}>
        <DialogContent className="join-dialog" showCloseButton={false}>
          <DialogHeader><DialogTitle>{t("takeSeat")}</DialogTitle><DialogDescription>{t("takeSeatDescription")}</DialogDescription></DialogHeader>
          <form onSubmit={join} className="dialog-form">
            <label htmlFor="player-name">{t("yourName")}</label>
            <Input id="player-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={t("namePlaceholder")} maxLength={24} autoFocus />
            <Button type="submit" disabled={!name.trim() || busy}>{busy ? t("joining") : t("joinTable")}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
