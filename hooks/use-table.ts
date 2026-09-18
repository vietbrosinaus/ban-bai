"use client";

import PartySocket from "partysocket";
import { useCallback, useEffect, useRef, useState } from "react";

import { useHydrated, useStoredValue } from "@/hooks/use-hydrated";

import { PRESENCE, nextAnchorToSend, type Anchor } from "@/lib/domain/presence";
import type { SeatRole } from "@/lib/domain/card";
import type { ClientMessage, ServerMessage, TableSnapshot } from "@/lib/domain/protocol";
import type { Command } from "@/lib/domain/table";
import { MISSING_HOST, PARTY_NAME, partyHost, tableDoor } from "@/lib/party-host";

export type TableStatus = "joining" | "live" | "reconnecting" | "offline" | "missing";

const LIGHT_COMMANDS = new Set<Command["type"]>(["move", "lift", "rotate", "adjustCounter"]);
const ACK_TIMEOUT_MS = 8000;
const CONNECT_GRACE_MS = 6000;

function seatKey(code: string) {
  return `ban-bai:${code}:seat`;
}

export function useTable(code: string) {
  const ready = useHydrated();
  const storedSeat = useStoredValue(seatKey(code));
  const [joinedSeat, setJoinedSeat] = useState("");
  const seatId = joinedSeat || storedSeat;
  const [table, setTable] = useState<TableSnapshot | null>(null);
  const [status, setStatus] = useState<TableStatus>("joining");
  const [pending, setPending] = useState<string | null>(null);
  const [fatal, setFatal] = useState(partyHost() ? "" : MISSING_HOST);

  const socketRef = useRef<PartySocket | null>(null);
  const tableRef = useRef<TableSnapshot | null>(null);
  const waitingRef = useRef(new Map<string, (result: TableSnapshot | null) => void>());
  const anchorRef = useRef<{ anchor: Anchor; sentAt: number } | null>(null);

  useEffect(() => {
    const host = partyHost();
    if (!host) { setStatus("missing"); setFatal(MISSING_HOST); return; }
    if (!ready || !seatId) return;

    const socket = new PartySocket({ host, party: PARTY_NAME, room: code, query: { seatId } });
    const stall = window.setTimeout(() => {
      if (socket.readyState !== socket.OPEN) setFatal(`Không kết nối được tới máy chủ bàn (${host}).`);
    }, CONNECT_GRACE_MS);
    socketRef.current = socket;

    const onOpen = () => { window.clearTimeout(stall); setFatal(""); setStatus("live"); };
    const onClose = () => setStatus(navigator.onLine ? "reconnecting" : "offline");
    const onMessage = (event: MessageEvent<string>) => {
      let message: ServerMessage;
      try {
        message = JSON.parse(event.data) as ServerMessage;
      } catch {
        return;
      }

      if (message.t === "snapshot") {
        tableRef.current = message.snapshot;
        setTable(message.snapshot);
        setStatus("live");
        return;
      }
      if (message.t === "hands") {
        const merged = tableRef.current ? { ...tableRef.current, liveHands: message.hands } : null;
        if (merged) { tableRef.current = merged; setTable(merged); }
        return;
      }
      if (message.t === "gone") {
        setStatus("missing");
        setFatal(message.message);
        return;
      }
      if (message.t === "ack" || message.t === "reject") {
        waitingRef.current.get(message.nonce)?.(message.t === "ack" ? tableRef.current : null);
        waitingRef.current.delete(message.nonce);
      }
    };

    socket.addEventListener("open", onOpen);
    socket.addEventListener("close", onClose);
    socket.addEventListener("message", onMessage);

    return () => {
      window.clearTimeout(stall);
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("close", onClose);
      socket.removeEventListener("message", onMessage);
      socket.close();
      socketRef.current = null;
    };
  }, [code, ready, seatId]);

  const join = useCallback(async (name: string, role: SeatRole = "player") => {
    const response = await fetch(tableDoor(code), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "join", name, role, seatId: seatId || undefined }),
    });
    const result = await response.json() as { seatId?: string; error?: string };
    if (!response.ok || !result.seatId) throw new Error(result.error ?? "Không vào được bàn.");
    window.localStorage.setItem(seatKey(code), result.seatId);
    window.localStorage.setItem("ban-bai:name", name);
    setJoinedSeat(result.seatId);
    return result.seatId;
  }, [code, seatId]);

  const send = useCallback((command: Command) => {
    const socket = socketRef.current;
    if (!seatId || !socket) return Promise.resolve(null);

    const heavy = !LIGHT_COMMANDS.has(command.type);
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (heavy) setPending(command.type);

    return new Promise<TableSnapshot | null>((resolve) => {
      const settle = (result: TableSnapshot | null) => {
        window.clearTimeout(timer);
        if (heavy) setPending(null);
        resolve(result);
      };
      const timer = window.setTimeout(() => {
        waitingRef.current.delete(nonce);
        settle(null);
      }, ACK_TIMEOUT_MS);

      waitingRef.current.set(nonce, settle);
      socket.send(JSON.stringify({ t: "command", nonce, command } satisfies ClientMessage));
    });
  }, [seatId]);

  const setAnchor = useCallback((anchor: Anchor, grabbing = false) => {
    const socket = socketRef.current;
    if (!seatId || !socket || socket.readyState !== socket.OPEN) return;
    const now = performance.now();
    if (!nextAnchorToSend(anchor, anchorRef.current, now)) return;
    anchorRef.current = { anchor, sentAt: now };
    socket.send(JSON.stringify({ t: "hand", anchor, grabbing } satisfies ClientMessage));
  }, [seatId]);

  return { ready, seatId, table, status, pending, fatal, join, send, setAnchor, settleMs: PRESENCE.settleMs };
}
