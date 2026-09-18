export type TamFaction = "wei" | "shu" | "wu" | "qun";

export type TamGeneral = {
  id: string;
  name: string;
  faction: TamFaction;
  maxHp: number;
  asset: string;
};

const roster: ReadonlyArray<readonly [string, string, TamFaction, number?]> = [
  ["caocao", "Tào Tháo", "wei"], ["simayi", "Tư Mã Ý", "wei", 3], ["xiahoudun", "Hạ Hầu Đôn", "wei"], ["zhangliao", "Trương Liêu", "wei"], ["xuchu", "Hứa Chử", "wei"],
  ["guojia", "Quách Gia", "wei", 3], ["zhenji", "Chân Thị", "wei", 3], ["xiahouyuan", "Hạ Hầu Uyên", "wei"], ["zhanghe", "Trương Cáp", "wei"], ["xuhuang", "Từ Hoảng", "wei"],
  ["caoren", "Tào Nhân", "wei"], ["dianwei", "Điển Vi", "wei"], ["xunyu", "Tuân Úc", "wei", 3], ["caopi", "Tào Phi", "wei", 3], ["yuejin", "Nhạc Tiến", "wei"],
  ["liubei", "Lưu Bị", "shu"], ["guanyu", "Quan Vũ", "shu", 5], ["zhangfei", "Trương Phi", "shu"], ["zhugeliang", "Gia Cát Lượng", "shu", 3], ["zhaoyun", "Triệu Vân", "shu"],
  ["machao", "Mã Siêu", "shu"], ["huangyueying", "Hoàng Nguyệt Anh", "shu", 3], ["huangzhong", "Hoàng Trung", "shu"], ["weiyan", "Ngụy Diên", "shu"], ["pangtong", "Bàng Thống", "shu", 3],
  ["wolong", "Khổng Minh", "shu", 3], ["liushan", "Lưu Thiện", "shu", 3], ["menghuo", "Mạnh Hoạch", "shu"], ["zhurong", "Chúc Dung", "shu"], ["ganfuren", "Cam Phu Nhân", "shu", 3],
  ["sunquan", "Tôn Quyền", "wu"], ["ganning", "Cam Ninh", "wu"], ["lvmeng", "Lữ Mông", "wu"], ["huanggai", "Hoàng Cái", "wu"], ["zhouyu", "Chu Du", "wu", 3],
  ["daqiao", "Đại Kiều", "wu", 3], ["luxun", "Lục Tốn", "wu", 3], ["sunshangxiang", "Tôn Thượng Hương", "wu", 3], ["sunjian", "Tôn Kiên", "wu"], ["xiaoqiao", "Tiểu Kiều", "wu", 3],
  ["taishici", "Thái Sử Từ", "wu"], ["zhoutai", "Chu Thái", "wu"], ["lusu", "Lỗ Túc", "wu", 3], ["erzhang", "Trương Chiêu & Trương Hoành", "wu", 3], ["dingfeng", "Đinh Phụng", "wu"],
  ["huatuo", "Hoa Đà", "qun", 3], ["lvbu", "Lữ Bố", "qun", 5], ["diaochan", "Điêu Thuyền", "qun", 3], ["yuanshao", "Viên Thiệu", "qun"], ["yanliangwenchou", "Nhan Lương & Văn Xú", "qun"],
  ["jiaxu", "Giả Hủ", "qun", 3], ["pangde", "Bàng Đức", "qun"], ["zhangjiao", "Trương Giác", "qun", 3], ["caiwenji", "Thái Văn Cơ", "qun", 3], ["mateng", "Mã Đằng", "qun"],
  ["kongrong", "Khổng Dung", "qun", 3], ["jiling", "Kỷ Linh", "qun"], ["tianfeng", "Điền Phong", "qun", 3], ["panfeng", "Phan Phụng", "qun"], ["zoushi", "Trâu Thị", "qun", 3],
];

export const tamQuocSatGenerals: TamGeneral[] = roster.map(([id, name, faction, maxHp = 4]) => ({
  id,
  name,
  faction,
  maxHp,
  asset: `/tam-quoc-sat/generals/${id}.jpg`,
}));

export const tamQuocSatGeneralById = new Map(tamQuocSatGenerals.map((general) => [general.id, general]));
