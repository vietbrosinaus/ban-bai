import type { Suit } from "./card";

export type PrintedCard = {
  id: string;
  rank: string;
  suit: Suit;
  cardType: string;
  name: string;
  asset: string;
};

type TamQuocCard = {
  name: string;
  asset: string;
};

export type TamQuocSatCardInfo = {
  nameEn: string;
  category: "basic" | "trick" | "delayed-trick" | "weapon" | "armor" | "mount";
  ruleVi: string;
  ruleEn: string;
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

export const tamQuocSatCardInfo = {
  slash: { nameEn: "Slash", category: "basic", ruleVi: "Trong giai đoạn ra bài, chọn một người trong tầm đánh. Người đó chịu 1 sát thương nếu không dùng Ngự. Thông thường mỗi giai đoạn chỉ dùng 1 lá Sát.", ruleEn: "During your play phase, target a player in attack range. They take 1 damage unless they play Dodge. Normally limited to one Slash per play phase." },
  fire_slash: { nameEn: "Fire Slash", category: "basic", ruleVi: "Dùng như Sát, nhưng gây 1 sát thương Hỏa. Sát thương Hỏa có thể truyền giữa những người đang bị Xích.", ruleEn: "Used like Slash, but deals 1 fire damage. Fire damage can spread between chained players." },
  thunder_slash: { nameEn: "Thunder Slash", category: "basic", ruleVi: "Dùng như Sát, nhưng gây 1 sát thương Lôi. Sát thương Lôi có thể truyền giữa những người đang bị Xích.", ruleEn: "Used like Slash, but deals 1 thunder damage. Thunder damage can spread between chained players." },
  dodge: { nameEn: "Dodge", category: "basic", ruleVi: "Dùng để đáp lại Sát nhằm vô hiệu hiệu quả của lá Sát đó. Cũng có thể dùng khi một hiệu ứng như Vạn Tiễn Tề Phát yêu cầu.", ruleEn: "Play in response to Slash to avoid its effect. It may also be played when an effect such as Archery Attack requires it." },
  peach: { nameEn: "Peach", category: "basic", ruleVi: "Hồi 1 sinh lực cho chính bạn trong giai đoạn ra bài, hoặc hồi 1 sinh lực cho một người đang hấp hối khi cứu họ.", ruleEn: "Recover 1 health during your play phase, or restore 1 health to a dying player when rescuing them." },
  alcohol: { nameEn: "Alcohol", category: "basic", ruleVi: "Mỗi giai đoạn ra bài dùng tối đa 1 lần: lá Sát tiếp theo trong lượt gây thêm 1 sát thương. Khi hấp hối, bạn có thể tự dùng để hồi 1 sinh lực.", ruleEn: "Once per play phase, make your next Slash this turn deal +1 damage. While dying, you may use it on yourself to recover 1 health." },
  duel: { nameEn: "Duel", category: "trick", ruleVi: "Chọn một người khác. Bắt đầu từ họ, hai bên luân phiên đánh Sát; người đầu tiên không đánh được Sát chịu 1 sát thương từ người kia.", ruleEn: "Target another player. Starting with them, alternate playing Slash; the first player who cannot do so takes 1 damage from the other." },
  dismantlement: { nameEn: "Dismantlement", category: "trick", ruleVi: "Chọn một người khác có bài trong tay, khu trang bị hoặc khu phán xét; bỏ 1 lá trong một trong các khu đó.", ruleEn: "Target another player with a card in hand, equipment, or judgment area; discard one card from one of those areas." },
  snatch: { nameEn: "Snatch", category: "trick", ruleVi: "Chọn một người khác ở khoảng cách 1 có bài trong tay, khu trang bị hoặc khu phán xét; lấy 1 lá từ một trong các khu đó.", ruleEn: "Target another player at distance 1 with a card in hand, equipment, or judgment area; take one card from one of those areas." },
  archery_attack: { nameEn: "Archery Attack", category: "trick", ruleVi: "Mỗi người chơi khác lần lượt phải đánh 1 lá Ngự; ai không đánh được chịu 1 sát thương.", ruleEn: "Each other player must play Dodge in turn or take 1 damage." },
  savage_assault: { nameEn: "Savage Assault", category: "trick", ruleVi: "Mỗi người chơi khác lần lượt phải đánh 1 lá Sát; ai không đánh được chịu 1 sát thương.", ruleEn: "Each other player must play Slash in turn or take 1 damage." },
  ex_nihilo: { nameEn: "Ex Nihilo", category: "trick", ruleVi: "Dùng cho bản thân để rút 2 lá bài.", ruleEn: "Play on yourself to draw 2 cards." },
  god_salvation: { nameEn: "God Salvation", category: "trick", ruleVi: "Theo thứ tự lượt, mỗi người đang bị thương hồi 1 sinh lực.", ruleEn: "In turn order, each wounded player recovers 1 health." },
  amazing_grace: { nameEn: "Amazing Grace", category: "trick", ruleVi: "Lật số lá bằng số người còn sống. Theo thứ tự lượt, mỗi người chọn và nhận 1 lá; bỏ các lá còn lại.", ruleEn: "Reveal one card per living player. In turn order, each player takes one; discard any cards left over." },
  collateral: { nameEn: "Collateral", category: "trick", ruleVi: "Chọn một người có vũ khí, rồi chọn người thứ hai trong tầm đánh của họ. Người thứ nhất phải dùng Sát lên người thứ hai, nếu không phải giao vũ khí cho bạn.", ruleEn: "Choose a player with a weapon, then another player in their attack range. The first must Slash the second or give you their weapon." },
  nullification: { nameEn: "Nullification", category: "trick", ruleVi: "Dùng trước khi hiệu quả của một Cẩm Nang tác dụng lên mục tiêu để vô hiệu hiệu quả đó, hoặc để vô hiệu một lá Vô Giải Khả Kích khác.", ruleEn: "Play before a trick affects its target to cancel that effect, or to cancel another Nullification." },
  heg_nullification: { nameEn: "Hegemony Nullification", category: "trick", ruleVi: "Trong luật Quốc Chiến, vô hiệu hiệu quả Cẩm Nang đối với một người hoặc cả một thế lực, hoặc vô hiệu một lá Vô Giải Khả Kích khác.", ruleEn: "In Hegemony rules, cancel a trick's effect on one player or an entire faction, or cancel another Nullification." },
  iron_chain: { nameEn: "Iron Chain", category: "trick", ruleVi: "Chọn 1–2 người để đổi trạng thái Xích. Sát thương thuộc tính truyền giữa những người đang Xích. Có thể tái đúc: bỏ lá này và rút 1 lá.", ruleEn: "Toggle the chained state of one or two players. Elemental damage spreads between chained players. May be recast: discard it and draw 1 card." },
  fire_attack: { nameEn: "Fire Attack", category: "trick", ruleVi: "Chọn một người có bài trên tay; họ lật 1 lá. Nếu bạn bỏ 1 lá cùng chất, họ chịu 1 sát thương Hỏa.", ruleEn: "Target a player with cards in hand; they reveal one. If you discard a card of the same suit, they take 1 fire damage." },
  await_exhausted: { nameEn: "Await Exhausted", category: "trick", ruleVi: "Bạn và những người cùng thế lực lần lượt rút 2 lá, sau đó mỗi người bỏ 2 lá.", ruleEn: "You and players of your faction each draw 2 cards, then each discard 2 cards." },
  known_both: { nameEn: "Known Both", category: "trick", ruleVi: "Chọn một người khác để xem một lá tướng đang úp hoặc xem bài trên tay của họ. Có thể tái đúc: bỏ lá này và rút 1 lá.", ruleEn: "Target another player to view one hidden general or their hand. May be recast: discard it and draw 1 card." },
  befriend_attacking: { nameEn: "Befriend Attacking", category: "trick", ruleVi: "Chọn một người thuộc thế lực khác. Người đó rút 1 lá, sau đó bạn rút 3 lá.", ruleEn: "Target a player of a different faction. They draw 1 card, then you draw 3 cards." },
  indulgence: { nameEn: "Indulgence", category: "delayed-trick", ruleVi: "Đặt vào khu phán xét của người khác. Đầu lượt họ phán xét: nếu không phải Cơ, họ bỏ qua giai đoạn ra bài; sau đó bỏ lá này.", ruleEn: "Place in another player's judgment area. At the start of their turn, judge: unless it is a heart, they skip their play phase; then discard this card." },
  supply_shortage: { nameEn: "Supply Shortage", category: "delayed-trick", ruleVi: "Đặt vào khu phán xét của người ở khoảng cách 1. Đầu lượt họ phán xét: nếu không phải Tép, họ bỏ qua giai đoạn rút bài; sau đó bỏ lá này.", ruleEn: "Place in the judgment area of a player at distance 1. At the start of their turn, judge: unless it is a club, they skip their draw phase; then discard this card." },
  lightning: { nameEn: "Lightning", category: "delayed-trick", ruleVi: "Phán xét ở đầu lượt: nếu là Bích 2–9, người đó chịu 3 sát thương Lôi và bỏ lá này; nếu không, chuyển Thiểm Điện sang người kế tiếp.", ruleEn: "Judge at the start of the turn: on spades 2–9, that player takes 3 thunder damage and discards this card; otherwise pass Lightning to the next player." },
  crossbow: { nameEn: "Crossbow", category: "weapon", ruleVi: "Tầm đánh 1. Trong giai đoạn ra bài, bạn có thể dùng số lượng Sát không giới hạn.", ruleEn: "Attack range 1. During your play phase, you may use any number of Slash cards." },
  double_sword: { nameEn: "Double Sword", category: "weapon", ruleVi: "Tầm đánh 2. Khi Sát một người khác giới tính, bạn có thể buộc họ bỏ 1 lá trên tay; nếu họ không bỏ, bạn rút 1 lá.", ruleEn: "Attack range 2. When you Slash a player of the opposite gender, you may make them discard a hand card; if they do not, draw 1 card." },
  qinggang_sword: { nameEn: "Qinggang Sword", category: "weapon", ruleVi: "Tầm đánh 2. Khi Sát chỉ định mục tiêu, bỏ qua hiệu quả phòng cụ của người đó trong lần kết toán này.", ruleEn: "Attack range 2. When your Slash targets a player, ignore their armor for that resolution." },
  ice_sword: { nameEn: "Ice Sword", category: "weapon", ruleVi: "Tầm đánh 2. Khi Sát sắp gây sát thương cho người có bài, bạn có thể ngăn sát thương và thay vào đó lần lượt bỏ tối đa 2 lá của họ.", ruleEn: "Attack range 2. Before your Slash damages a player who has cards, you may prevent the damage and instead discard up to two of their cards, one at a time." },
  spear: { nameEn: "Spear", category: "weapon", ruleVi: "Tầm đánh 3. Bạn có thể dùng hoặc đánh ra 2 lá trên tay như 1 lá Sát.", ruleEn: "Attack range 3. You may use or play two hand cards as one Slash." },
  fan: { nameEn: "Fan", category: "weapon", ruleVi: "Tầm đánh 4. Bạn có thể dùng một lá Sát thường như Hỏa Sát.", ruleEn: "Attack range 4. You may use a normal Slash as Fire Slash." },
  axe: { nameEn: "Axe", category: "weapon", ruleVi: "Tầm đánh 3. Khi Sát bị Ngự hóa giải, bạn có thể bỏ 2 lá để lá Sát đó vẫn gây sát thương.", ruleEn: "Attack range 3. When your Slash is dodged, you may discard 2 cards to make it still deal damage." },
  kylin_bow: { nameEn: "Kylin Bow", category: "weapon", ruleVi: "Tầm đánh 5. Sau khi Sát gây sát thương, bạn có thể bỏ 1 tọa kỵ trong khu trang bị của mục tiêu.", ruleEn: "Attack range 5. After your Slash deals damage, you may discard one mount from the target's equipment area." },
  six_swords: { nameEn: "Six Swords", category: "weapon", ruleVi: "Tầm đánh 2. Những người khác cùng thế lực với bạn được tăng tầm đánh thêm 1.", ruleEn: "Attack range 2. Other players of your faction gain +1 attack range." },
  triblade: { nameEn: "Triblade", category: "weapon", ruleVi: "Tầm đánh 3. Sau khi Sát gây sát thương, bạn có thể bỏ 1 lá trên tay để gây 1 sát thương cho một người khác cách mục tiêu 1.", ruleEn: "Attack range 3. After your Slash deals damage, you may discard a hand card to deal 1 damage to another player at distance 1 from the target." },
  eight_diagram: { nameEn: "Eight Diagram", category: "armor", ruleVi: "Khi cần dùng Ngự, bạn có thể phán xét; nếu kết quả đỏ, xem như đã dùng 1 lá Ngự.", ruleEn: "When you need to play Dodge, you may judge; on a red card, treat it as if you played Dodge." },
  renwang_shield: { nameEn: "Renwang Shield", category: "armor", ruleVi: "Khóa định: các lá Sát màu đen không có hiệu quả với bạn.", ruleEn: "Locked: black Slash cards have no effect on you." },
  silver_lion: { nameEn: "Silver Lion", category: "armor", ruleVi: "Khóa định: mỗi lần chịu hơn 1 sát thương, giảm xuống còn 1. Khi mất Bạch Ngân Sư Tử khỏi khu trang bị, hồi 1 sinh lực.", ruleEn: "Locked: whenever you would take more than 1 damage, reduce it to 1. When Silver Lion leaves your equipment area, recover 1 health." },
  vine: { nameEn: "Vine", category: "armor", ruleVi: "Khóa định: Nam Man Nhập Xâm, Vạn Tiễn Tề Phát và Sát thường không có hiệu quả với bạn; sát thương Hỏa bạn chịu tăng thêm 1.", ruleEn: "Locked: Savage Assault, Archery Attack, and normal Slash have no effect on you; fire damage you take is increased by 1." },
  jueying: { nameEn: "Jueying", category: "mount", ruleVi: "Tọa kỵ +1: người khác tính khoảng cách đến bạn tăng 1.", ruleEn: "+1 mount: other players calculate their distance to you as 1 greater." },
  dilu: { nameEn: "Dilu", category: "mount", ruleVi: "Tọa kỵ +1: người khác tính khoảng cách đến bạn tăng 1.", ruleEn: "+1 mount: other players calculate their distance to you as 1 greater." },
  zhuahuangfeidian: { nameEn: "Zhua Huang Fei Dian", category: "mount", ruleVi: "Tọa kỵ +1: người khác tính khoảng cách đến bạn tăng 1.", ruleEn: "+1 mount: other players calculate their distance to you as 1 greater." },
  chitu: { nameEn: "Chi Tu", category: "mount", ruleVi: "Tọa kỵ −1: bạn tính khoảng cách đến người khác giảm 1.", ruleEn: "−1 mount: calculate your distance to other players as 1 less." },
  dayuan: { nameEn: "Da Yuan", category: "mount", ruleVi: "Tọa kỵ −1: bạn tính khoảng cách đến người khác giảm 1.", ruleEn: "−1 mount: calculate your distance to other players as 1 less." },
  zixing: { nameEn: "Zi Xing", category: "mount", ruleVi: "Tọa kỵ −1: bạn tính khoảng cách đến người khác giảm 1.", ruleEn: "−1 mount: calculate your distance to other players as 1 less." },
} as const satisfies Record<keyof typeof cards, TamQuocSatCardInfo>;

export function getTamQuocSatCardInfo(cardType?: string) {
  if (!cardType || !(cardType in tamQuocSatCardInfo)) return undefined;
  return tamQuocSatCardInfo[cardType as keyof typeof tamQuocSatCardInfo];
}

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

export function createTamQuocSatDeck(): PrintedCard[] {
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

