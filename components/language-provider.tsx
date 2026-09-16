"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

export type Language = "vi" | "en";
type Vars = Record<string, string | number>;

const copy: Record<Language, Record<string, string>> = {
  vi: {
    language: "Ngôn ngữ", vietnamese: "Tiếng Việt", english: "English",
    noAccount: "Không cần tài khoản", home: "Trang chủ Bàn Bài",
    heroEyebrow: "Bàn chơi dành cho hội bạn", heroTitle: "Chơi bài cùng nhau.",
    heroIntro: "Tạo bàn riêng, gửi một đường link và chơi theo luật của bạn.",
    availableGames: "Các trò chơi hiện có và sắp ra mắt", customGames: "+ trò chơi tùy biến", tamLive: "Tam Quốc Sát · trực tiếp",
    seatWaiting: "Ghế của bạn đang chờ", startPlaying: "Bắt đầu", yourName: "Tên của bạn", namePlaceholder: "Ví dụ: Minh",
    chooseDeck: "Chọn bộ bài", classicCards: "Bài Tây", sandbox52: "Bộ bài tự do 52 lá", tamDeck: "Bộ bài chuẩn 108 lá",
    settingTable: "Đang dọn bàn…", createTable: "Tạo bàn mới", joinFriends: "Đã có mã phòng?", roomCode: "MÃ PHÒNG", joinRoom: "Vào phòng",
    players: "1–10 người chơi", inviteByLink: "Mời bằng link", privateLinks: "Link phòng riêng", liveTable: "Bàn chơi đồng bộ trực tiếp",
    createError: "Không thể tạo bàn chơi.", joinError: "Không thể vào phòng này.", loadError: "Không thể tải bàn chơi.", moveError: "Thao tác chưa được thực hiện.",
    tableUnavailable: "Không thể mở bàn", backHome: "Về trang chủ", inviteFriends: "Mời bạn bè", room: "Phòng", copyInvite: "Sao chép link mời",
    live: "Trực tiếp", offline: "Ngoại tuyến", reconnecting: "Đang kết nối lại", connecting: "Đang kết nối",
    tamMode: "Tam Quốc Sát · 108 lá", sandboxMode: "Bộ bài tự do 52 lá", fixedSeating: "Vị trí ngồi cố định quanh bàn",
    you: "Bạn", turn: "Lượt", cards: "{count} lá", yourSeat: "{name}, chỗ ngồi của bạn", seat: "{name}, ghế {seat}",
    addTarget: "Chọn {name} làm mục tiêu", removeTarget: "Bỏ {name} khỏi mục tiêu", hiddenGeneral: "Tướng ẩn", noGeneral: "Chưa chọn tướng",
    chained: "Xích", faceDown: "Úp mặt", equipmentCount: "{count} trang bị", delayedCount: "{count} lá phán xét", shareCircle: "Gửi link để mời thêm người vào bàn",
    sharedCanvas: "Mặt bàn chung", canvasHelp: "Kéo để chọn · Shift-bấm để chọn thêm · Chuột phải để thao tác", canvasAria: "Mặt bàn tự do dùng chung",
    drawFromDeck: "Rút bài, còn {count} lá", tapDeck: "Bấm vào chồng bài để rút", discard: "Chồng bỏ",
    dropAnywhere: "Thả ở bất kỳ đâu", yourTableRules: "Bàn của bạn, luật của bạn", emptyCanvas: "Đánh bài, tạo chồng và thêm bộ đếm cho bất kỳ trò chơi nào.",
    tableControls: "Điều khiển bàn", host: "Chủ phòng", cardsEach: "Mỗi người {count} lá", cardsPerPlayer: "Số lá mỗi người", deal: "Chia bài",
    addCounter: "Thêm bộ đếm", shuffleDeck: "Xáo bài", clearCanvas: "Dọn mặt bàn", resetTable: "Đặt lại bàn",
    selectedCards: "Đã chọn {count} lá", faceDownCard: "Lá bài úp", dragOrPile: "Kéo cùng nhau hoặc tạo chồng", doubleClickDraw: "Nhấp đúp để rút", arrowsOrDrag: "Bấm mũi tên hoặc kéo để di chuyển",
    selectedCardControls: "Điều khiển lá bài đã chọn", selectedPileControls: "Điều khiển chồng bài đã chọn", selectedCounterControls: "Điều khiển bộ đếm đã chọn", moveSelected: "Di chuyển mục đã chọn",
    moveLeft: "Sang trái", moveUp: "Lên trên", moveDown: "Xuống dưới", moveRight: "Sang phải", makePile: "Tạo chồng", flip: "Lật", rotateLeft: "Xoay trái", rotateRight: "Xoay phải",
    front: "Đưa lên trên", toHand: "Về tay", discardSelected: "Bỏ các lá đã chọn", draw: "Rút", shuffle: "Xáo", spread: "Trải ra", discardPile: "Bỏ cả chồng",
    decreaseCounter: "Giảm bộ đếm", increaseCounter: "Tăng bộ đếm", removeCounter: "Xóa bộ đếm", closeControls: "Đóng thanh điều khiển",
    pileActions: "Thao tác chồng bài", cardActions: "Thao tác lá bài", selectedCardCount: "{count} lá đã chọn", makeFaceDownPile: "Tạo chồng úp", rotate15: "Xoay 15°", bringFront: "Đưa lên trên cùng",
    moveMyHand: "Đưa về tay", drawToHand: "Rút về tay", playTop: "Đánh lá trên cùng ngửa", shufflePile: "Xáo chồng", flipPile: "Lật chồng", addSelected: "Thêm các lá đã chọn", spreadCards: "Trải bài",
    updatingTable: "Đang cập nhật bàn…", loadingTable: "Đang tải bàn…", yourHand: "Bài trên tay", handHint: "Chọn một lá rồi đánh ngửa hoặc úp", chooseGenerals: "Rút tướng", redrawGenerals: "Rút lại",
    healthControls: "Điều khiển sinh lực", decreaseMaxHp: "Giảm sinh lực tối đa", increaseMaxHp: "Tăng sinh lực tối đa", max: "tối đa", myTurn: "Lượt của tôi", equip: "Trang bị", judge: "Phán xét", leave: "Rời bàn",
    handEmpty: "Tay bạn đang trống", drawing: "Đang rút…", drawCard: "Rút một lá", play: "Đánh", giveTo: "Đưa cho…", give: "Đưa", cancelSelection: "Hủy chọn bài", cancelZone: "Hủy chọn khu vực",
    randomGeneralTitle: "Rút tướng ngẫu nhiên", generalsDescription: "Hai tướng được xáo và chia ngẫu nhiên. Chỉ bạn thấy chúng cho đến khi lật.", drawTwoGenerals: "Rút 2 tướng", generalsDrawn: "Đã rút 2 tướng ngẫu nhiên", redrawHint: "Bạn có thể rút lại nếu luật của nhóm cho phép.", hp: "HP",
    discardTitle: "Chồng bài bỏ", discardDescription: "Mọi lá bài đã bỏ hoặc được dọn đều công khai. Bấm một lá để lấy lại khi hiệu ứng thủ công yêu cầu.", noDiscard: "Chưa có lá bài nào bị bỏ.",
    counterDescription: "Dùng bộ đếm cho sinh lực, tiền, điểm, lượt hoặc bất kỳ luật nào nhóm bạn nghĩ ra.", label: "Nhãn", counterPlaceholder: "Ví dụ: Sinh lực", color: "Màu", addToCanvas: "Thêm lên bàn", colorCounter: "Bộ đếm màu {color}",
    takeSeat: "Ngồi vào bàn", takeSeatDescription: "Nhập tên mà bạn bè sẽ thấy. Không cần tài khoản hay mật khẩu.", joining: "Đang vào…", joinTable: "Vào bàn", joined: "Bạn đã vào bàn.", copied: "Đã sao chép link mời.",
    choose: "Chọn", hidden: "Đang ẩn", hide: "Ẩn", reveal: "Lật", noCards: "0 lá", faceDownTitle: "Lá bài úp", rankOfSuit: "{rank} {suit}",
    equipZone: "Trang bị", judgeZone: "Phán xét", counterValue: "{label}, giá trị {value}", actionsFor: "Thao tác với {name}", close: "Đóng",
  },
  en: {
    language: "Language", vietnamese: "Tiếng Việt", english: "English",
    noAccount: "No account needed", home: "Bàn Bài home",
    heroEyebrow: "A table for your crew", heroTitle: "Play cards together.",
    heroIntro: "Create a private table, share one link, and play by your own rules.",
    availableGames: "Available and planned games", customGames: "+ custom games", tamLive: "Tam Quốc Sát · live",
    seatWaiting: "Your seat is waiting", startPlaying: "Get started", yourName: "Your name", namePlaceholder: "e.g. Minh",
    chooseDeck: "Choose a deck", classicCards: "Classic cards", sandbox52: "52-card sandbox", tamDeck: "108-card standard deck",
    settingTable: "Setting the table…", createTable: "Create new table", joinFriends: "Already have a room code?", roomCode: "ROOM CODE", joinRoom: "Join room",
    players: "1–10 players", inviteByLink: "Invite by link", privateLinks: "Private room links", liveTable: "Live shared table",
    createError: "Could not create the table.", joinError: "Could not join that room.", loadError: "Could not load the table.", moveError: "The move did not go through.",
    tableUnavailable: "Table unavailable", backHome: "Back home", inviteFriends: "Invite friends", room: "Room", copyInvite: "Copy invite link",
    live: "Live", offline: "Offline", reconnecting: "Reconnecting", connecting: "Connecting",
    tamMode: "Tam Quốc Sát · 108 cards", sandboxMode: "52-card sandbox", fixedSeating: "Fixed table seating",
    you: "You", turn: "Turn", cards: "{count} card(s)", yourSeat: "{name}, your seat", seat: "{name}, seat {seat}",
    addTarget: "Add {name} as target", removeTarget: "Remove {name} as target", hiddenGeneral: "Hidden general", noGeneral: "No general selected",
    chained: "Chained", faceDown: "Face down", equipmentCount: "{count} equipment", delayedCount: "{count} delayed tricks", shareCircle: "Share the link to fill the circle",
    sharedCanvas: "Shared canvas", canvasHelp: "Drag to select · Shift-click to add · Right-click for actions", canvasAria: "Shared freeform tabletop canvas",
    drawFromDeck: "Draw from deck, {count} cards remaining", tapDeck: "Tap deck to draw", discard: "Discard",
    dropAnywhere: "Drop it anywhere", yourTableRules: "Your table, your rules", emptyCanvas: "Play cards, build piles, and add counters for any game.",
    tableControls: "Table controls", host: "Host", cardsEach: "{count} cards each", cardsPerPlayer: "Cards per player", deal: "Deal",
    addCounter: "Add counter", shuffleDeck: "Shuffle deck", clearCanvas: "Clear canvas", resetTable: "Reset table",
    selectedCards: "{count} cards selected", faceDownCard: "Face-down card", dragOrPile: "Drag together or make a pile", doubleClickDraw: "Double-click to draw", arrowsOrDrag: "Tap arrows or drag to move",
    selectedCardControls: "Selected card controls", selectedPileControls: "Selected pile controls", selectedCounterControls: "Selected counter controls", moveSelected: "Move selected item",
    moveLeft: "Move left", moveUp: "Move up", moveDown: "Move down", moveRight: "Move right", makePile: "Make pile", flip: "Flip", rotateLeft: "Rotate selected cards left", rotateRight: "Rotate selected cards right",
    front: "Front", toHand: "To hand", discardSelected: "Discard selected cards", draw: "Draw", shuffle: "Shuffle", spread: "Spread", discardPile: "Discard entire pile",
    decreaseCounter: "Decrease counter", increaseCounter: "Increase counter", removeCounter: "Remove counter", closeControls: "Close canvas controls",
    pileActions: "Pile actions", cardActions: "Card actions", selectedCardCount: "{count} selected cards", makeFaceDownPile: "Make face-down pile", rotate15: "Rotate 15°", bringFront: "Bring to front",
    moveMyHand: "Move to my hand", drawToHand: "Draw to hand", playTop: "Play top face-up", shufflePile: "Shuffle pile", flipPile: "Flip pile", addSelected: "Add selected cards", spreadCards: "Spread cards",
    updatingTable: "Updating the table…", loadingTable: "Loading the table…", yourHand: "Your hand", handHint: "Choose a card, then play it face-up or face-down", chooseGenerals: "Draw generals", redrawGenerals: "Draw again",
    healthControls: "Health controls", decreaseMaxHp: "Decrease maximum health", increaseMaxHp: "Increase maximum health", max: "max", myTurn: "My turn", equip: "Equip", judge: "Judge", leave: "Leave",
    handEmpty: "Your hand is empty", drawing: "Drawing…", drawCard: "Draw a card", play: "Play", giveTo: "Give to…", give: "Give", cancelSelection: "Cancel card selection", cancelZone: "Cancel zone selection",
    randomGeneralTitle: "Draw random generals", generalsDescription: "Two generals are shuffled and dealt at random. Only you can see them until you reveal them.", drawTwoGenerals: "Draw 2 generals", generalsDrawn: "Two random generals drawn", redrawHint: "Draw again if your house rules allow it.", hp: "HP",
    discardTitle: "Discard pile", discardDescription: "All discarded and cleared cards are public. Tap a card to retrieve it when a manual effect calls for it.", noDiscard: "No cards have been discarded yet.",
    counterDescription: "Use counters for health, coins, score, turns, or any rule your group invents.", label: "Label", counterPlaceholder: "e.g. Health", color: "Color", addToCanvas: "Add to canvas", colorCounter: "{color} counter",
    takeSeat: "Take a seat", takeSeatDescription: "Enter the name your friends will see. No account or password needed.", joining: "Joining…", joinTable: "Join table", joined: "You’re at the table.", copied: "Invite link copied.",
    choose: "Choose", hidden: "Hidden", hide: "Hide", reveal: "Reveal", noCards: "0 cards", faceDownTitle: "Face-down card", rankOfSuit: "{rank} of {suit}",
    equipZone: "Equip", judgeZone: "Judge", counterValue: "{label}, value {value}", actionsFor: "Actions for {name}", close: "Close",
  },
};

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, vars?: Vars) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const languageEvent = "ban-bai:language-change";

function readLanguage(): Language {
  if (typeof window === "undefined") return "vi";
  return window.localStorage.getItem("ban-bai:language") === "en" ? "en" : "vi";
}

function subscribeLanguage(callback: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === "ban-bai:language") callback(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(languageEvent, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(languageEvent, callback);
  };
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore<Language>(subscribeLanguage, readLanguage, (): Language => "vi");

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === "vi" ? "Bàn Bài | Bàn chơi bài trực tuyến" : "Bàn Bài | Your shared card table";
    document.querySelector('meta[name="description"]')?.setAttribute("content", language === "vi" ? "Tạo phòng, mời bạn bè và cùng chơi bài trực tuyến." : "Create a room, invite friends, and play cards together online.");
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage(next) {
      window.localStorage.setItem("ban-bai:language", next);
      window.dispatchEvent(new Event(languageEvent));
    },
    t(key, vars = {}) {
      if (key === "cards" && typeof vars.count === "number") {
        return language === "vi" ? `${vars.count} lá` : `${vars.count} ${vars.count === 1 ? "card" : "cards"}`;
      }
      const template = copy[language][key] ?? copy.en[key] ?? key;
      return template.replace(/\{(\w+)\}/g, (_match: string, name: string) => String(vars[name] ?? `{${name}}`));
    },
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div className={`language-toggle ${compact ? "is-compact" : ""}`} role="group" aria-label={t("language")}>
      <button type="button" onClick={() => setLanguage("vi")} aria-label={t("vietnamese")} aria-pressed={language === "vi"}>VI</button>
      <button type="button" onClick={() => setLanguage("en")} aria-label={t("english")} aria-pressed={language === "en"}>EN</button>
    </div>
  );
}

export function localizeServerText(text: string, language: Language) {
  if (language === "en") return text;
  const exact: Record<string, string> = {
    "Could not create the table.": "Không thể tạo bàn chơi.",
    "Could not join that room.": "Không thể vào phòng này.",
    "Could not join the room.": "Không thể vào phòng này.",
    "Could not load the table.": "Không thể tải bàn chơi.",
    "The move did not go through.": "Thao tác chưa được thực hiện.",
    "Room not found": "Không tìm thấy phòng.",
    "Room is full": "Phòng đã đầy.",
    "Player not found": "Không tìm thấy người chơi.",
    "Only the host can do that": "Chỉ chủ phòng mới có thể thực hiện thao tác này.",
    "Not enough cards in the deck": "Không còn đủ bài trong chồng.",
    "The shared table is temporarily unavailable.": "Bàn chơi chung đang tạm thời không khả dụng.",
    "That room does not exist.": "Phòng này không tồn tại.",
    "Please enter your name.": "Vui lòng nhập tên của bạn.",
    "Could not create a room. Please try again.": "Không thể tạo phòng. Vui lòng thử lại.",
    "The table changed at the same time. Please try again.": "Bàn vừa được người khác thay đổi. Vui lòng thử lại.",
    "Join the room before playing.": "Hãy vào phòng trước khi chơi.",
    "Only the host can do that.": "Chỉ chủ phòng mới có thể thực hiện thao tác này.",
    "This room is full.": "Phòng này đã đầy.",
    "The deck is empty.": "Chồng bài đã hết.",
    "That card is not in your hand.": "Lá bài này không còn trên tay bạn.",
    "Choose another player.": "Hãy chọn người chơi khác.",
    "You can only take back your latest card.": "Bạn chỉ có thể lấy lại lá vừa đánh gần nhất.",
    "That card is no longer in the discard pile.": "Lá bài này không còn trong chồng bỏ.",
    "The canvas is already empty.": "Mặt bàn đã trống.",
    "That item is no longer on the canvas.": "Vật này không còn trên mặt bàn.",
    "Those cards are no longer on the canvas.": "Các lá này không còn trên mặt bàn.",
    "Select at least two cards to make a pile.": "Chọn ít nhất hai lá để tạo chồng.",
    "That pile is no longer on the canvas.": "Chồng bài này không còn trên mặt bàn.",
    "That pile is empty.": "Chồng bài này đã hết.",
    "Select cards to add to the pile.": "Chọn các lá muốn thêm vào chồng.",
    "That counter is no longer on the canvas.": "Bộ đếm này không còn trên mặt bàn.",
    "There are not enough general cards left.": "Không còn đủ lá tướng.",
    "Choose two different generals.": "Hãy chọn hai tướng khác nhau.",
    "Choose a general card first.": "Hãy chọn tướng trước.",
    "Health did not change.": "Sinh lực không thay đổi.",
  };
  if (exact[text]) return exact[text];

  const patterns: Array<[RegExp, (...parts: string[]) => string]> = [
    [/^(.+) opened the table$/, (name) => `${name} đã mở bàn`],
    [/^(.+) returned to the table$/, (name) => `${name} đã quay lại bàn`],
    [/^(.+) joined the table$/, (name) => `${name} đã vào bàn`],
    [/^(.+) drew a card$/, (name) => `${name} đã rút 1 lá`],
    [/^(.+) drew (\d+) cards$/, (name, count) => `${name} đã rút ${count} lá`],
    [/^(.+) dealt (\d+) cards each$/, (name, count) => `${name} đã chia mỗi người ${count} lá`],
    [/^(.+) shuffled the deck$/, (name) => `${name} đã xáo bài`],
    [/^(.+) reset the table$/, (name) => `${name} đã đặt lại bàn`],
    [/^(.+) cleared the canvas$/, (name) => `${name} đã dọn mặt bàn`],
    [/^(.+) moved an item$/, (name) => `${name} đã di chuyển một vật`],
    [/^(.+) moved (\d+) cards$/, (name, count) => `${name} đã di chuyển ${count} lá`],
    [/^(.+) stacked (\d+) cards into a pile$/, (name, count) => `${name} đã xếp ${count} lá thành chồng`],
    [/^(.+) played (.+)$/, (name, card) => `${name} đã đánh ${card}`],
    [/^(.+) discarded (.+)$/, (name, card) => `${name} đã bỏ ${card}`],
    [/^(.+) equipped (.+)$/, (name, card) => `${name} đã trang bị ${card}`],
    [/^(.+) took back a card$/, (name) => `${name} đã lấy lại một lá`],
    [/^(.+) added a (.+)$/, (name, item) => `${name} đã thêm ${item}`],
    [/^(.+) removed (.+)$/, (name, item) => `${name} đã xóa ${item}`],
    [/^(.+) chose two hidden generals$/, (name) => `${name} đã chọn hai tướng ẩn`],
    [/^(.+) drew two hidden generals$/, (name) => `${name} đã rút hai tướng ẩn`],
    [/^(.+) is now taking a turn$/, (name) => `Đến lượt ${name}`],
  ];
  for (const [pattern, format] of patterns) {
    const match = text.match(pattern);
    if (match) return format(...match.slice(1));
  }
  return text;
}

export function pileName(label: string, language: Language) {
  if (language === "vi") return label.replace(/^Pile\s+(\d+)$/i, "Chồng $1");
  return label;
}
