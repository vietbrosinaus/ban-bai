"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { LanguageToggle, useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TableDeck } from "@/lib/domain/setup";
import { cn } from "@/lib/utils";

const DECKS: Array<{ id: TableDeck; mark: string; title?: string; titleKey?: string; noteKey: string }> = [
  { id: "classic-52", mark: "♠", titleKey: "classicCards", noteKey: "sandbox52" },
  { id: "tam-quoc-sat", mark: "殺", title: "Tam Quốc Sát", noteKey: "tamDeck" },
];

export default function Lobby() {
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [deck, setDeck] = useState<TableDeck>("tam-quoc-sat");

  async function createTable(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const response = await fetch("/api/tables", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, deck }) });
      const result = await response.json() as { code?: string; seatId?: string; error?: string };
      if (!response.ok || !result.code || !result.seatId) throw new Error(result.error ?? t("createError"));
      window.localStorage.setItem(`ban-bai:${result.code}:seat`, result.seatId);
      window.localStorage.setItem("ban-bai:name", name.trim());
      router.push(`/room/${result.code}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("createError"));
    } finally {
      setBusy(false);
    }
  }

  async function joinTable(event: FormEvent) {
    event.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!name.trim() || code.length < 4) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/tables/${encodeURIComponent(code)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "join", name, role: "player" }) });
      const result = await response.json() as { seatId?: string; error?: string };
      if (!response.ok || !result.seatId) throw new Error(result.error ?? t("joinError"));
      window.localStorage.setItem(`ban-bai:${code}:seat`, result.seatId);
      window.localStorage.setItem("ban-bai:name", name.trim());
      router.push(`/room/${code}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("joinError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-svh flex-col bg-[radial-gradient(circle_at_15%_12%,rgba(19,117,90,0.055),transparent_32%),#f5f1e8]">
      <header className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between px-[clamp(1rem,4vw,3rem)] sm:h-[4.5rem]">
        <span className="inline-flex items-center gap-2.5 text-[1.02rem] font-extrabold tracking-tight text-foreground">
          <span className="grid size-9 grid-cols-2 place-items-center rounded-[0.625rem] bg-foreground p-1 font-serif text-[0.7rem] text-white">
            <span>♠</span>
            <span className="text-[#ff8166]">♥</span>
          </span>
          Bàn Bài
        </span>
        <LanguageToggle />
      </header>

      <section className="mx-auto grid w-full max-w-[1180px] flex-1 grid-cols-1 items-center gap-10 px-[clamp(1rem,4vw,3rem)] pt-[clamp(2.375rem,9vh,6.75rem)] pb-[clamp(1.75rem,8vh,5.5rem)] lg:grid-cols-2 lg:gap-14">
        <div className="mx-auto max-w-[39rem] text-center lg:mx-0 lg:text-left">
          <div className="mb-5 flex justify-center gap-2 font-serif text-base font-semibold text-[#13755a] lg:justify-start">
            <span>♠</span><span className="text-[#df5d43]">♥</span><span>♣</span><span className="text-[#df5d43]">♦</span>
          </div>
          <h1 className="font-serif text-[clamp(3rem,6vw,5.8rem)] leading-[0.98] font-medium tracking-[-0.03em] text-foreground">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-6 max-w-[35rem] text-[clamp(0.96rem,1.3vw,1.12rem)] leading-relaxed text-[#5f6a64] lg:mx-0">
            {t("heroIntro")}
          </p>
        </div>

        <div className="w-full max-w-[27.5rem] justify-self-center rounded-[1.375rem] border border-[#ddd6ca] bg-[#fffdf8] p-[clamp(1.4rem,3.2vw,2.125rem)] shadow-[0_1.25rem_3.4rem_rgba(34,49,41,0.1)] lg:justify-self-end">
          <div className="mb-6">
            <h2 className="font-serif text-[1.72rem] font-medium tracking-[-0.035em] text-foreground sm:text-[2rem]">{t("startPlaying")}</h2>
            <p className="mt-1.5 text-[0.78rem] text-[#7a827d]">{t("noAccount")}</p>
          </div>

          <form onSubmit={createTable} className="grid gap-2.5">
            <label htmlFor="create-name" className="text-[0.78rem] font-bold text-[#4e5a54]">{t("yourName")}</label>
            <Input id="create-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={t("namePlaceholder")} autoComplete="nickname" maxLength={24} className="h-12 rounded-[0.625rem] border-[#d8d1c5] bg-white px-3.5" />

            <fieldset className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <legend className="mb-1 text-[0.72rem] font-bold text-[#4e5a54]">{t("chooseDeck")}</legend>
              {DECKS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDeck(option.id)}
                  aria-pressed={deck === option.id}
                  className={cn(
                    "grid min-h-[3.75rem] grid-cols-[1.875rem_minmax(0,1fr)] items-center gap-2 rounded-xl border border-[#d8d1c5] bg-white p-2.5 text-left transition-colors hover:border-[#9bad9f]",
                    deck === option.id && "border-[#16765b] bg-[#f0f7f4] shadow-[inset_0_0_0_1px_#16765b]",
                  )}
                >
                  <span className={cn(
                    "grid h-[2.2rem] w-[1.8rem] place-items-center rounded-md border border-[#d8cfbf] bg-card-face font-serif text-[0.95rem] font-bold",
                    option.id === "tam-quoc-sat" && "border-[#c9973f] bg-[#2a4a3c] text-gilt",
                  )}>{option.mark}</span>
                  <span className="min-w-0">
                    <b className="block truncate text-[0.84rem] text-foreground">{option.title ?? t(option.titleKey!)}</b>
                    <small className="block truncate text-[0.68rem] text-[#7a827d]">{t(option.noteKey)}</small>
                  </span>
                </button>
              ))}
            </fieldset>

            <Button type="submit" disabled={!name.trim() || busy} className="mt-1 h-12 rounded-[0.625rem] bg-[#e85f43] font-bold hover:bg-[#d85136]">
              {busy ? t("settingTable") : t("createTable")}
              {busy ? null : <ArrowRight />}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[0.72rem] text-[#858c87] before:h-px before:flex-1 before:bg-[#e1d9ca] before:content-[''] after:h-px after:flex-1 after:bg-[#e1d9ca] after:content-['']">
            {t("joinFriends")}
          </div>

          <form onSubmit={joinTable} className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_auto]">
            <label className="sr-only" htmlFor="room-code">{t("roomCode")}</label>
            <Input id="room-code" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder={t("roomCode")} maxLength={6} className="h-12 rounded-[0.625rem] border-[#d8d1c5] bg-white px-3.5 font-extrabold tracking-[0.13em] uppercase" />
            <Button type="submit" variant="outline" disabled={!name.trim() || roomCode.length < 4 || busy} className="h-12 rounded-[0.625rem] border-[#c9c1b4] font-bold">
              {t("joinRoom")}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
