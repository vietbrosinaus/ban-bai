import { createTamQuocSatDeck, getTamQuocSatCardInfo, type TamQuocSatCardInfo } from "@/lib/domain/tam-quoc-sat";
import { tamQuocSatGenerals } from "@/lib/domain/tam-quoc-sat-generals";
import { getTamQuocSatGeneralInfo, type TamGeneralSkillInfo } from "@/lib/domain/tam-quoc-sat-general-rules";

import type { CardFace, CardId, Faction } from "./card";

export type CardCategory = TamQuocSatCardInfo["category"];

export type CardRole = "attack" | "defend" | "heal" | "trick" | "delayed" | "weapon" | "armor" | "mount" | "general";

export type CardRules =
  | { kind: "play"; category: CardCategory; role: CardRole; nameEn: string; ruleVi: string; ruleEn: string }
  | { kind: "general"; role: "general"; faction: Faction; maxHp: number; skills: readonly TamGeneralSkillInfo[] };

export const ROLE_LABEL: Record<CardRole, string> = {
  attack: "Tấn công",
  defend: "Phòng thủ",
  heal: "Hồi phục",
  trick: "Cẩm nang",
  delayed: "Cẩm nang trì hoãn",
  weapon: "Vũ khí",
  armor: "Phòng cụ",
  mount: "Ngựa",
  general: "Tướng",
};

const ATTACK_TYPES = new Set(["slash", "fire_slash", "thunder_slash"]);
const DEFEND_TYPES = new Set(["dodge", "nullification", "heg_nullification"]);
const HEAL_TYPES = new Set(["peach", "alcohol"]);

function roleOf(category: CardCategory, cardType: string | undefined): CardRole {
  if (category === "weapon") return "weapon";
  if (category === "armor") return "armor";
  if (category === "mount") return "mount";
  if (category === "delayed-trick") return "delayed";
  if (category === "trick") return cardType && DEFEND_TYPES.has(cardType) ? "defend" : "trick";
  if (cardType && ATTACK_TYPES.has(cardType)) return "attack";
  if (cardType && DEFEND_TYPES.has(cardType)) return "defend";
  if (cardType && HEAL_TYPES.has(cardType)) return "heal";
  return "trick";
}

export const CATEGORY_LABEL: Record<CardCategory, string> = {
  basic: "Cơ bản",
  trick: "Cẩm nang",
  "delayed-trick": "Cẩm nang trì hoãn",
  weapon: "Vũ khí",
  armor: "Phòng cụ",
  mount: "Ngựa",
};

export type DeckKind = "tam-quoc-sat" | "generals" | "classic-52";

const SUITS = ["spades", "hearts", "diamonds", "clubs"] as const;
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const ruleKeys = new Map<CardId, string>();

function buildCatalogue(): Map<CardId, CardFace> {
  const catalogue = new Map<CardId, CardFace>();
  for (const card of createTamQuocSatDeck()) {
    if (card.cardType) ruleKeys.set(card.id, card.cardType);
    catalogue.set(card.id, {
      id: card.id,
      kind: "play",
      name: card.name ?? card.rank,
      suit: card.suit,
      rank: card.rank,
      art: card.asset ?? "",
    });
  }
  for (const general of tamQuocSatGenerals) {
    catalogue.set(`general-${general.id}`, {
      id: `general-${general.id}`,
      kind: "general",
      name: general.name,
      suit: "spades",
      rank: String(general.maxHp),
      art: general.asset,
      faction: general.faction,
      maxHp: general.maxHp,
    });
  }
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const id = `classic-${suit}-${rank}`;
      catalogue.set(id, { id, kind: "play", name: `${rank}${suit}`, suit, rank, art: "" });
    }
  }
  return catalogue;
}

let catalogue: Map<CardId, CardFace> | undefined;

function all() {
  catalogue ??= buildCatalogue();
  return catalogue;
}

export function cardFace(id: CardId): CardFace | undefined {
  return all().get(id);
}

export function deckOf(kind: DeckKind): CardId[] {
  const cards = [...all().values()];
  if (kind === "generals") return cards.filter((card) => card.kind === "general").map((card) => card.id);
  if (kind === "classic-52") return cards.filter((card) => card.id.startsWith("classic-")).map((card) => card.id);
  return cards.filter((card) => card.kind === "play" && !card.id.startsWith("classic-")).map((card) => card.id);
}


export function cardRules(id: CardId): CardRules | undefined {
  const card = cardFace(id);
  if (!card) return undefined;
  if (card.kind === "general") {
    const general = getTamQuocSatGeneralInfo(id);
    if (!general) return undefined;
    return { kind: "general", role: "general", faction: general.faction, maxHp: general.maxHp, skills: general.skills };
  }
  const cardType = ruleKeys.get(id);
  const info = getTamQuocSatCardInfo(cardType);
  if (!info) return undefined;
  return { kind: "play", category: info.category, role: roleOf(info.category, cardType), nameEn: info.nameEn, ruleVi: info.ruleVi, ruleEn: info.ruleEn };
}

