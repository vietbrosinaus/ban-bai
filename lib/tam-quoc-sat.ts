import type { PlayingCard, Suit } from "@/lib/game";

type TamQuocCard = {
  name: string;
  asset: string;
};

type CardPrint = readonly [cardType: keyof typeof cards, suit: Suit, rank: number];

const cards = {
  slash: { name: "Sát", asset: "slash" },
  fire_slash: { name: "Hỏa Sát", asset: "fire_slash" },
  thunder_slash: { name: "Lôi Sát", asset: "thunder_slash" },
  dodge: { name: "Ngự", asset: "jink" },
  peach: { name: "Đào", asset: "peach" },
  alcohol: { name: "Rượu", asset: "analeptic" },
  duel: { name: "Quyết Đấu", asset: "duel" },
  dismantlement: { name: "Quá Hà Sách Kiều", asset: "dismantlement" },
  snatch: { name: "Thuận Thủ Khiên Dương", asset: "snatch" },
  archery_attack: { name: "Vạn Tiễn Tề Phát", asset: "archery_attack" },
  savage_assault: { name: "Nam Man Nhập Xâm", asset: "savage_assault" },
  ex_nihilo: { name: "Vô Trung Sinh Hữu", asset: "ex_nihilo" },
  god_salvation: { name: "Đào Viên Kết Nghĩa", asset: "god_salvation" },
  amazing_grace: { name: "Ngũ Cốc Phong Đăng", asset: "amazing_grace" },
  collateral: { name: "Tá Đao Sát Nhân", asset: "collateral" },
  nullification: { name: "Vô Giải Khả Kích", asset: "nullification" },
  heg_nullification: { name: "Vô Giải Khả Kích", asset: "heg_nullification" },
  iron_chain: { name: "Xích Sắt Liên Hoàn", asset: "iron_chain" },
  fire_attack: { name: "Hỏa Công", asset: "fire_attack" },
  await_exhausted: { name: "Dĩ Dật Đãi Lao", asset: "await_exhausted" },
  known_both: { name: "Tri Bỉ Tri Kỷ", asset: "known_both" },
  befriend_attacking: { name: "Viễn Giao Cận Công", asset: "befriend_attacking" },
  indulgence: { name: "Lạc Bất Tư Thục", asset: "indulgence" },
  supply_shortage: { name: "Binh Lương Thốn Đoạn", asset: "supply_shortage" },
  lightning: { name: "Thiểm Điện", asset: "lightning" },
  crossbow: { name: "Gia Cát Liên Châu Nỗ", asset: "Crossbow" },
  double_sword: { name: "Thư Hùng Song Cổ Kiếm", asset: "DoubleSword" },
  qinggang_sword: { name: "Thanh Công Kiếm", asset: "QinggangSword" },
  ice_sword: { name: "Hàn Băng Kiếm", asset: "IceSword" },
  spear: { name: "Trượng Bát Xà Mâu", asset: "Spear" },
  fan: { name: "Chu Tước Vũ Phiến", asset: "Fan" },
  axe: { name: "Quán Thạch Phủ", asset: "Axe" },
  kylin_bow: { name: "Kỳ Lân Cung", asset: "KylinBow" },
  six_swords: { name: "Ngô Lục Kiếm", asset: "SixSwords" },
  triblade: { name: "Tam Tiêm Lưỡng Nhận Đao", asset: "Triblade" },
  eight_diagram: { name: "Bát Quái Đồ", asset: "EightDiagram" },
  renwang_shield: { name: "Nhân Vương Thuẫn", asset: "RenwangShield" },
  silver_lion: { name: "Bạch Ngân Sư Tử", asset: "SilverLion" },
  vine: { name: "Đằng Giáp", asset: "Vine" },
  jueying: { name: "Tuyệt Ảnh", asset: "JueYing" },
  dilu: { name: "Đích Lư", asset: "DiLu" },
  zhuahuangfeidian: { name: "Trảo Hoàng Phi Điện", asset: "ZhuaHuangFeiDian" },
  chitu: { name: "Xích Thố", asset: "ChiTu" },
  dayuan: { name: "Đại Uyển", asset: "DaYuan" },
  zixing: { name: "Tử Tinh", asset: "ZiXing" },
} as const satisfies Record<string, TamQuocCard>;

const prints: readonly CardPrint[] = [
  ["slash", "spades", 5], ["slash", "spades", 7], ["slash", "spades", 8], ["slash", "spades", 8], ["slash", "spades", 9], ["slash", "spades", 10], ["slash", "spades", 11],
  ["slash", "clubs", 2], ["slash", "clubs", 3], ["slash", "clubs", 4], ["slash", "clubs", 5], ["slash", "clubs", 8], ["slash", "clubs", 9], ["slash", "clubs", 10], ["slash", "clubs", 11], ["slash", "clubs", 11],
  ["slash", "hearts", 10], ["slash", "hearts", 12], ["slash", "diamonds", 10], ["slash", "diamonds", 11], ["slash", "diamonds", 12],
  ["fire_slash", "hearts", 4], ["fire_slash", "diamonds", 4], ["fire_slash", "diamonds", 5],
  ["thunder_slash", "spades", 6], ["thunder_slash", "spades", 7], ["thunder_slash", "clubs", 6], ["thunder_slash", "clubs", 7], ["thunder_slash", "clubs", 8],
  ["dodge", "hearts", 2], ["dodge", "hearts", 11], ["dodge", "hearts", 13], ["dodge", "diamonds", 2], ["dodge", "diamonds", 3], ["dodge", "diamonds", 6], ["dodge", "diamonds", 7], ["dodge", "diamonds", 7], ["dodge", "diamonds", 8], ["dodge", "diamonds", 8], ["dodge", "diamonds", 9], ["dodge", "diamonds", 10], ["dodge", "diamonds", 11], ["dodge", "diamonds", 13],
  ["peach", "hearts", 4], ["peach", "hearts", 6], ["peach", "hearts", 7], ["peach", "hearts", 8], ["peach", "hearts", 9], ["peach", "hearts", 10], ["peach", "hearts", 12], ["peach", "diamonds", 2],
  ["alcohol", "spades", 9], ["alcohol", "clubs", 9], ["alcohol", "diamonds", 9],
  ["crossbow", "diamonds", 1], ["double_sword", "spades", 2], ["qinggang_sword", "spades", 6], ["ice_sword", "spades", 2], ["spear", "spades", 12], ["fan", "diamonds", 1], ["axe", "diamonds", 5], ["kylin_bow", "hearts", 5], ["six_swords", "diamonds", 6], ["triblade", "diamonds", 12],
  ["eight_diagram", "spades", 2], ["renwang_shield", "clubs", 2], ["vine", "clubs", 2], ["silver_lion", "clubs", 1],
  ["jueying", "spades", 5], ["dilu", "clubs", 5], ["zhuahuangfeidian", "hearts", 13], ["chitu", "hearts", 5], ["dayuan", "spades", 13], ["zixing", "diamonds", 13],
  ["amazing_grace", "hearts", 3], ["god_salvation", "hearts", 1], ["savage_assault", "spades", 13], ["savage_assault", "clubs", 7], ["archery_attack", "hearts", 1],
  ["duel", "spades", 1], ["duel", "clubs", 1], ["ex_nihilo", "hearts", 7], ["ex_nihilo", "hearts", 8],
  ["snatch", "spades", 3], ["snatch", "spades", 4], ["snatch", "diamonds", 3],
  ["dismantlement", "spades", 3], ["dismantlement", "spades", 4], ["dismantlement", "hearts", 12],
  ["iron_chain", "spades", 12], ["iron_chain", "clubs", 12], ["iron_chain", "clubs", 13], ["fire_attack", "hearts", 2], ["fire_attack", "hearts", 3],
  ["collateral", "clubs", 12], ["nullification", "spades", 11], ["heg_nullification", "clubs", 13], ["heg_nullification", "diamonds", 12],
  ["await_exhausted", "hearts", 11], ["await_exhausted", "diamonds", 4], ["known_both", "clubs", 3], ["known_both", "clubs", 4], ["befriend_attacking", "hearts", 9],
  ["indulgence", "clubs", 6], ["indulgence", "hearts", 6], ["supply_shortage", "spades", 10], ["supply_shortage", "clubs", 10], ["lightning", "spades", 1],
];

function displayRank(rank: number) {
  if (rank === 1) return "A";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return String(rank);
}

export function createTamQuocSatDeck(): PlayingCard[] {
  const copies = new Map<string, number>();
  return prints.map(([cardType, suit, rank]) => {
    const printId = `${cardType}-${suit}-${rank}`;
    const copy = (copies.get(printId) ?? 0) + 1;
    copies.set(printId, copy);
    const card = cards[cardType];
    return {
      id: `tqs-${printId}-${copy}`,
      rank: displayRank(rank),
      suit,
      cardType,
      name: card.name,
      asset: `/tam-quoc-sat/cards/${card.asset}.png`,
    };
  });
}

export const TAM_QUOC_SAT_DECK_SIZE = prints.length;
