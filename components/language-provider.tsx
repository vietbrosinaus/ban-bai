"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";

export type Language = "vi" | "en";

const copy: Record<Language, Record<string, string>> = {
  vi: {
    chooseDeck: "Chọn bộ bài",
    classicCards: "Bài Tây",
    createError: "Không thể tạo bàn chơi.",
    createTable: "Tạo bàn mới",
    english: "English",
    heroIntro: "Tạo bàn riêng, gửi một đường link và chơi theo luật của bạn.",
    heroTitle: "Chơi bài cùng nhau.",
    home: "Trang chủ Bàn Bài",
    joinError: "Không thể vào phòng này.",
    joinFriends: "Đã có mã phòng?",
    joinRoom: "Vào phòng",
    language: "Ngôn ngữ",
    namePlaceholder: "Ví dụ: Minh",
    noAccount: "Không cần tài khoản",
    roomCode: "MÃ PHÒNG",
    sandbox52: "Bộ bài tự do 52 lá",
    settingTable: "Đang dọn bàn…",
    startPlaying: "Bắt đầu",
    tamDeck: "Bộ bài chuẩn 108 lá",
    vietnamese: "Tiếng Việt",
    yourName: "Tên của bạn",
  },
  en: {
    chooseDeck: "Choose a deck",
    classicCards: "Classic cards",
    createError: "Could not create the table.",
    createTable: "Create new table",
    english: "English",
    heroIntro: "Create a private table, share one link, and play by your own rules.",
    heroTitle: "Play cards together.",
    home: "Bàn Bài home",
    joinError: "Could not join that room.",
    joinFriends: "Already have a room code?",
    joinRoom: "Join room",
    language: "Language",
    namePlaceholder: "e.g. Minh",
    noAccount: "No account needed",
    roomCode: "ROOM CODE",
    sandbox52: "52-card sandbox",
    settingTable: "Setting the table…",
    startPlaying: "Get started",
    tamDeck: "108-card standard deck",
    vietnamese: "Tiếng Việt",
    yourName: "Your name",
  },
};

const LanguageContext = createContext<Language>("vi");
const STORAGE_KEY = "ban-bai:language";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("ban-bai:language", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("ban-bai:language", onChange);
  };
}

function readLanguage(): Language {
  return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "vi";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore(subscribe, readLanguage, () => "vi" as Language);
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const language = useContext(LanguageContext);
  return useMemo(
    () => ({ language, t: (key: string) => copy[language][key] ?? copy.vi[key] ?? key }),
    [language],
  );
}

export function setLanguage(next: Language) {
  window.localStorage.setItem(STORAGE_KEY, next);
  window.dispatchEvent(new Event("ban-bai:language"));
}

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, t } = useLanguage();
  return (
    <div
      role="group"
      aria-label={t("language")}
      className={`inline-flex items-center gap-0.5 rounded-[0.625rem] border border-[#d8d1c5] bg-white/55 p-[3px] ${compact ? "shrink-0" : ""}`}
    >
      {(["vi", "en"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLanguage(option)}
          aria-pressed={language === option}
          className={`rounded-[7px] px-2 text-[0.7rem] font-extrabold tracking-wide uppercase transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gilt ${compact ? "h-7 min-w-[1.875rem]" : "h-8 min-w-9"} ${
            language === option ? "bg-foreground text-[#fffdf7] shadow-sm" : "text-[#66716b] hover:bg-[#13755a]/10 hover:text-[#125f49]"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
