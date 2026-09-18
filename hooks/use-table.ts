"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useHydrated, useStoredValue } from "@/hooks/use-hydrated";

import type { TableSnapshot } from "@/lib/application/table-service";
import { PRESENCE, nextAnchorToSend, type Anchor } from "@/lib/domain/presence";
import type { SeatRole } from "@/lib/domain/card";
import type { Command } from "@/lib/domain/table";

export const TABLE_POLL_MS = 1000;
export const TABLE_POLL_HIDDEN_MS = 4000;

export type TableStatus = "joining" | "live" | "reconnecting" | "offline" | "missing";

type JoinReply = { seatId: string; table: TableSnapshot; error?: string };

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
  const [fatal, setFatal] = useState("");

  const revisionRef = useRef(0);
  const sendingRef = useRef(false);
  const anchorRef = useRef<{ anchor: Anchor; sentAt: number } | null>(null);

  const absorb = useCallback((snapshot: TableSnapshot) => {
    revisionRef.current = snapshot.revision;
    setTable(snapshot);
    setStatus("live");
  }, []);

  const refresh = useCallback(async (id: string, signal?: AbortSignal) => {
    try {
      const url = `/api/tables/${encodeURIComponent(code)}?seatId=${encodeURIComponent(id)}&since=${revisionRef.current}`;
      const response = await fetch(url, { cache: "no-store", signal });
      if (response.status === 204) { setStatus("live"); return; }
      if (response.status === 404) { setStatus("missing"); setFatal("Bàn này không tồn tại."); return; }
      if (!response.ok) { setStatus("reconnecting"); return; }
      absorb(await response.json() as TableSnapshot);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus(navigator.onLine ? "reconnecting" : "offline");
    }
  }, [absorb, code]);

  useEffect(() => {
    if (!ready || !seatId) return;
    let stopped = false;
    let timer: number | undefined;
    let controller: AbortController | null = null;

    const loop = async () => {
      if (stopped) return;
      controller = new AbortController();
      await refresh(seatId, controller.signal);
      if (!stopped) timer = window.setTimeout(loop, document.hidden ? TABLE_POLL_HIDDEN_MS : TABLE_POLL_MS);
    };
    const wake = () => {
      if (timer) window.clearTimeout(timer);
      void loop();
    };

    void loop();
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      controller?.abort();
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [ready, refresh, seatId]);

  const join = useCallback(async (name: string, role: SeatRole = "player") => {
    const response = await fetch(`/api/tables/${encodeURIComponent(code)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "join", name, role, seatId: seatId || undefined }),
    });
    const result = await response.json() as JoinReply;
    if (!response.ok || !result.seatId) throw new Error(result.error ?? "Không vào được bàn.");
    window.localStorage.setItem(seatKey(code), result.seatId);
    window.localStorage.setItem("ban-bai:name", name);
    setJoinedSeat(result.seatId);
    absorb(result.table);
    return result.seatId;
  }, [absorb, code, seatId]);

  const send = useCallback(async (command: Command) => {
    if (!seatId || sendingRef.current) return null;
    sendingRef.current = true;
    setPending(command.type);
    try {
      const response = await fetch(`/api/tables/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ seatId, command }),
      });
      const result = await response.json() as TableSnapshot & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Nước đi không thành.");
      absorb(result);
      return result;
    } catch {
      setStatus(navigator.onLine ? "reconnecting" : "offline");
      void refresh(seatId);
      return null;
    } finally {
      sendingRef.current = false;
      setPending(null);
    }
  }, [absorb, code, refresh, seatId]);

  const setAnchor = useCallback((anchor: Anchor, grabbing = false) => {
    if (!seatId) return;
    const now = performance.now();
    if (!nextAnchorToSend(anchor, anchorRef.current, now)) return;
    anchorRef.current = { anchor, sentAt: now };
    void fetch(`/api/tables/${encodeURIComponent(code)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seatId, action: "hand", anchor, grabbing }),
      keepalive: true,
    }).catch(() => undefined);
  }, [code, seatId]);

  useEffect(() => () => {
    if (seatId) setAnchor({ kind: "home" });
  }, [seatId, setAnchor]);

  return { ready, seatId, table, status, pending, fatal, join, send, setAnchor, settleMs: PRESENCE.settleMs };
}
