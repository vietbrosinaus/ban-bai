"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageToggle, localizeServerText, useLanguage } from "@/components/language-provider";
import type { GameMode } from "@/lib/game";

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
        <LanguageToggle />
      </header>

      <section className="lobby-stage">
        <div className="lobby-copy">
          <div className="hero-suits" aria-hidden="true"><span>♠</span><span>♥</span><span>♣</span><span>♦</span></div>
          <h1>{t("heroTitle")}</h1>
          <p className="lobby-intro">{t("heroIntro")}</p>
        </div>

        <div className="entry-panel">
          <div className="entry-heading">
            <h2>{t("startPlaying")}</h2>
            <p>{t("noAccount")}</p>
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

        </div>
      </section>
    </main>
  );
}
