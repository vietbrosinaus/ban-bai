"use client";

import { ArrowRight, Copy, Layers3, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const previewCards = [
  { rank: "A", suit: "♠", color: "ink" },
  { rank: "10", suit: "♥", color: "red" },
  { rank: "K", suit: "♣", color: "ink" },
  { rank: "3", suit: "♦", color: "red" },
];

export default function Lobby() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function previewCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const response = await fetch("/api/rooms", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
      const result = await response.json() as { code?: string; playerId?: string; error?: string };
      if (!response.ok || !result.code || !result.playerId) throw new Error(result.error ?? "Could not create the table.");
      localStorage.setItem(`ban-bai:${result.code}:player`, result.playerId);
      localStorage.setItem("ban-bai:name", name.trim());
      router.push(`/room/${result.code}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the table.");
    } finally {
      setBusy(false);
    }
  }

  async function previewJoin(event: FormEvent) {
    event.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!name.trim() || code.length < 4) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(code)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "join", name }) });
      const result = await response.json() as { playerId?: string; error?: string };
      if (!response.ok || !result.playerId) throw new Error(result.error ?? "Could not join that room.");
      localStorage.setItem(`ban-bai:${code}:player`, result.playerId);
      localStorage.setItem("ban-bai:name", name.trim());
      router.push(`/room/${code}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not join that room.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="lobby-shell">
      <header className="site-header">
        <a className="brand" href="#" aria-label="Bàn Bài home">
          <span className="brand-mark"><span>♠</span><span>♥</span></span>
          <span>Bàn Bài</span>
        </a>
        <div className="header-status"><span className="status-pulse" /> No account needed</div>
      </header>

      <section className="lobby-stage">
        <div className="ambient-card ambient-card-one">♣</div>
        <div className="ambient-card ambient-card-two">♦</div>
        <div className="table-preview" aria-hidden="true">
          <div className="preview-player preview-player-left"><span>MP</span><i /></div>
          <div className="preview-player preview-player-top"><span>KT</span><i /></div>
          <div className="preview-player preview-player-right"><span>AN</span><i /></div>
          <div className="preview-deck"><span>BB</span></div>
          <div className="preview-cards">
            {previewCards.map((card, index) => (
              <div className={`preview-card ${card.color}`} key={`${card.rank}${card.suit}`} style={{ "--card-index": index } as React.CSSProperties}>
                <b>{card.rank}</b><span>{card.suit}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lobby-copy">
          <p className="eyebrow">A table for your crew</p>
          <h1>Cards on the table.<br />Friends in the room.</h1>
          <p className="lobby-intro">Open a private room, share one link, and start playing. Built for the card games we grew up with.</p>
          <div className="game-chips" aria-label="Planned games">
            <span>Tiến Lên</span><span>Tá Lả</span><span>Tam Quốc Sát</span><span>+ custom games</span>
          </div>
        </div>

        <div className="entry-panel">
          <div className="entry-heading">
            <div>
              <p className="panel-kicker">Your seat is waiting</p>
              <h2>Start playing</h2>
            </div>
            <Layers3 aria-hidden="true" />
          </div>

          <form onSubmit={previewCreate} className="entry-form">
            <label htmlFor="create-name">Your name</label>
            <Input id="create-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Minh" autoComplete="nickname" maxLength={24} />
            <Button className="primary-action" type="submit" disabled={!name.trim() || busy}>
              {busy ? "Setting the table…" : "Create a table"} {!busy && <ArrowRight />}
            </Button>
          </form>

          <div className="or-divider"><span>or join your friends</span></div>

          <form onSubmit={previewJoin} className="join-row">
            <div>
              <label className="sr-only" htmlFor="room-code">Room code</label>
              <Input id="room-code" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="ROOM CODE" maxLength={6} />
            </div>
            <Button type="submit" variant="outline" disabled={!name.trim() || roomCode.length < 4 || busy}>Join room</Button>
          </form>

          <div className="entry-notes">
            <span><Users /> 1–10 players</span>
            <span><Copy /> Invite by link</span>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <span>52-card sandbox</span>
        <span>Private room links</span>
        <span>Live shared table</span>
      </footer>
    </main>
  );
}
