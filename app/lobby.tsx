"use client";

import { ArrowRight, Copy, Layers3, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageToggle, localizeServerText, useLanguage } from "@/components/language-provider";
import type { GameMode } from "@/lib/game";

const previewCards = [
  { rank: "A", suit: "♠", color: "ink" },
  { rank: "10", suit: "♥", color: "red" },
  { rank: "K", suit: "♣", color: "ink" },
  { rank: "3", suit: "♦", color: "red" },
];

export default function Lobby() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [game, setGame] = useState<GameMode>("sandbox-52");

  async function previewCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const response = await fetch("/api/rooms", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, game }) });
      const result = await response.json() as { code?: string; playerId?: string; error?: string };
      if (!response.ok || !result.code || !result.playerId) throw new Error(result.error ?? t("createError"));
      localStorage.setItem(`ban-bai:${result.code}:player`, result.playerId);
      localStorage.setItem("ban-bai:name", name.trim());
      router.push(`/room/${result.code}`);
    } catch (error) {
      toast.error(error instanceof Error ? localizeServerText(error.message, language) : t("createError"));
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
      if (!response.ok || !result.playerId) throw new Error(result.error ?? t("joinError"));
      localStorage.setItem(`ban-bai:${code}:player`, result.playerId);
      localStorage.setItem("ban-bai:name", name.trim());
      router.push(`/room/${code}`);
    } catch (error) {
      toast.error(error instanceof Error ? localizeServerText(error.message, language) : t("joinError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="lobby-shell">
      <header className="site-header">
        <a className="brand" href="#" aria-label={t("home")}>
          <span className="brand-mark"><span>♠</span><span>♥</span></span>
          <span>Bàn Bài</span>
        </a>
        <div className="header-tools">
          <div className="header-status"><span className="status-pulse" /> {t("noAccount")}</div>
          <LanguageToggle />
        </div>
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
          <p className="eyebrow">{t("heroEyebrow")}</p>
          <h1>{t("heroTitle").split("\n").map((line, index) => <span key={line}>{line}{index === 0 && <br />}</span>)}</h1>
          <p className="lobby-intro">{t("heroIntro")}</p>
          <div className="game-chips" aria-label={t("availableGames")}>
            <span>Tiến Lên</span><span>Tá Lả</span><span>{t("tamLive")}</span><span>{t("customGames")}</span>
          </div>
        </div>

        <div className="entry-panel">
          <div className="entry-heading">
            <div>
              <p className="panel-kicker">{t("seatWaiting")}</p>
              <h2>{t("startPlaying")}</h2>
            </div>
            <Layers3 aria-hidden="true" />
          </div>

          <form onSubmit={previewCreate} className="entry-form">
            <label htmlFor="create-name">{t("yourName")}</label>
            <Input id="create-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={t("namePlaceholder")} autoComplete="nickname" maxLength={24} />
            <fieldset className="game-picker">
              <legend>{t("chooseDeck")}</legend>
              <button type="button" className={game === "sandbox-52" ? "is-selected" : ""} onClick={() => setGame("sandbox-52")} aria-pressed={game === "sandbox-52"}>
                <span className="picker-icon">♠</span><span><b>{t("classicCards")}</b><small>{t("sandbox52")}</small></span>
              </button>
              <button type="button" className={game === "tam-quoc-sat" ? "is-selected" : ""} onClick={() => setGame("tam-quoc-sat")} aria-pressed={game === "tam-quoc-sat"}>
                <span className="picker-icon picker-tqs">殺</span><span><b>Tam Quốc Sát</b><small>{t("tamDeck")}</small></span>
              </button>
            </fieldset>
            <Button className="primary-action" type="submit" disabled={!name.trim() || busy}>
              {busy ? t("settingTable") : t("createTable")} {!busy && <ArrowRight />}
            </Button>
          </form>

          <div className="or-divider"><span>{t("joinFriends")}</span></div>

          <form onSubmit={previewJoin} className="join-row">
            <div>
              <label className="sr-only" htmlFor="room-code">{t("roomCode")}</label>
              <Input id="room-code" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder={t("roomCode")} maxLength={6} />
            </div>
            <Button type="submit" variant="outline" disabled={!name.trim() || roomCode.length < 4 || busy}>{t("joinRoom")}</Button>
          </form>

          <div className="entry-notes">
            <span><Users /> {t("players")}</span>
            <span><Copy /> {t("inviteByLink")}</span>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <span>{t("sandbox52")}</span>
        <span>{t("privateLinks")}</span>
        <span>{t("liveTable")}</span>
      </footer>
    </main>
  );
}
