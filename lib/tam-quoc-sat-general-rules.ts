import { tamQuocSatGeneralById, type TamGeneral } from "@/lib/tam-quoc-sat-generals";

export type TamGeneralSkillInfo = {
  id: string;
  nameVi: string;
  descriptionVi: string;
};

export type TamGeneralInfo = TamGeneral & {
  skills: readonly TamGeneralSkillInfo[];
};

const generalSkillIds: Record<string, readonly string[]> = {
  "caocao": [
    "jianxiong"
  ],
  "simayi": [
    "fankui",
    "guicai"
  ],
  "xiahoudun": [
    "ganglie"
  ],
  "zhangliao": [
    "tuxi"
  ],
  "xuchu": [
    "luoyi"
  ],
  "guojia": [
    "tiandu",
    "yiji"
  ],
  "zhenji": [
    "qingguo",
    "luoshen"
  ],
  "xiahouyuan": [
    "shensu"
  ],
  "zhanghe": [
    "qiaobian"
  ],
  "xuhuang": [
    "duanliang"
  ],
  "caoren": [
    "jushou"
  ],
  "dianwei": [
    "qiangxi"
  ],
  "xunyu": [
    "quhu",
    "jieming"
  ],
  "caopi": [
    "xingshang",
    "fangzhu"
  ],
  "yuejin": [
    "xiaoguo"
  ],
  "liubei": [
    "rende"
  ],
  "guanyu": [
    "wusheng"
  ],
  "zhangfei": [
    "paoxiao"
  ],
  "zhugeliang": [
    "guanxing",
    "kongcheng"
  ],
  "zhaoyun": [
    "longdan"
  ],
  "machao": [
    "tieqi",
    "mashu"
  ],
  "huangyueying": [
    "jizhi",
    "qicai"
  ],
  "huangzhong": [
    "liegong"
  ],
  "weiyan": [
    "kuanggu"
  ],
  "pangtong": [
    "lianhuan",
    "niepan"
  ],
  "wolong": [
    "huoji",
    "kanpo",
    "bazhen"
  ],
  "liushan": [
    "xiangle",
    "fangquan"
  ],
  "menghuo": [
    "huoshou",
    "zaiqi"
  ],
  "zhurong": [
    "juxiang",
    "lieren"
  ],
  "ganfuren": [
    "shushen",
    "shenzhi"
  ],
  "sunquan": [
    "zhiheng"
  ],
  "ganning": [
    "qixi"
  ],
  "lvmeng": [
    "keji"
  ],
  "huanggai": [
    "kurou"
  ],
  "zhouyu": [
    "yingzi",
    "fanjian"
  ],
  "daqiao": [
    "guose",
    "liuli"
  ],
  "luxun": [
    "qianxun",
    "duoshi"
  ],
  "sunshangxiang": [
    "jieyin",
    "xiaoji"
  ],
  "sunjian": [
    "yinghun"
  ],
  "xiaoqiao": [
    "tianxiang",
    "hongyan"
  ],
  "taishici": [
    "tianyi"
  ],
  "zhoutai": [
    "buqu"
  ],
  "lusu": [
    "haoshi",
    "dimeng"
  ],
  "erzhang": [
    "zhijian",
    "guzheng"
  ],
  "dingfeng": [
    "duanbing",
    "fenxun"
  ],
  "huatuo": [
    "jijiu",
    "qingnang"
  ],
  "lvbu": [
    "wushuang"
  ],
  "diaochan": [
    "lijian",
    "biyue"
  ],
  "yuanshao": [
    "luanji"
  ],
  "yanliangwenchou": [
    "shuangxiong"
  ],
  "jiaxu": [
    "wansha",
    "luanwu",
    "weimu"
  ],
  "pangde": [
    "mashu",
    "mengjin"
  ],
  "zhangjiao": [
    "leiji",
    "guidao"
  ],
  "caiwenji": [
    "beige",
    "duanchang"
  ],
  "mateng": [
    "mashu",
    "xiongyi"
  ],
  "kongrong": [
    "mingshi",
    "lirang"
  ],
  "jiling": [
    "shuangren"
  ],
  "tianfeng": [
    "sijian",
    "suishi"
  ],
  "panfeng": [
    "kuangfu"
  ],
  "zoushi": [
    "huoshui",
    "qingcheng"
  ]
};

const skillInfo: Record<string, TamGeneralSkillInfo> = {
  "jianxiong": {
    "id": "jianxiong",
    "nameVi": "Gian Hùng",
    "descriptionVi": "Sau khi bạn nhận sát thương, bạn có thể thu lấy lá gây sát thương cho bạn."
  },
  "fankui": {
    "id": "fankui",
    "nameVi": "Phản Quỹ",
    "descriptionVi": "Sau khi bạn nhận sát thương, bạn có thể thu lấy 1 lá của nguồn sát thương."
  },
  "guicai": {
    "id": "guicai",
    "nameVi": "Quỷ Tài",
    "descriptionVi": "Khi phán xét của 1 người có hiệu lực, bạn có thể đánh ra 1 lá để thay thế kết quả phán xét đó."
  },
  "ganglie": {
    "id": "ganglie",
    "nameVi": "Cương Liệt",
    "descriptionVi": "Sau khi bạn nhận sát thương, bạn có thể tiến hành phán xét, nếu màu của kết quả phán xét có màu:\n* Đỏ: Bạn gây 1 sát thương cho nguồn sát thương;\n* Đen: bạn bỏ 1 lá của nguồn sát thương"
  },
  "tuxi": {
    "id": "tuxi",
    "nameVi": "Tập Kích",
    "descriptionVi": "Giai đoạn rút bài, bạn có thể chọn rút bớt X lá và chọn X người khác có bài trên tay, thu lấy 1 lá trên tay của mỗi người."
  },
  "luoyi": {
    "id": "luoyi",
    "nameVi": "Lỏa Y",
    "descriptionVi": "Khi kết thúc giai đoạn rút bài, bạn có thể bỏ 1 lá;\n▶ Trong lượt này, khi bạn gây sát thương cho mục tiêu của [Sát] hoặc [Quyết Đấu], sát thương này +1."
  },
  "tiandu": {
    "id": "tiandu",
    "nameVi": "Thiên Khiển",
    "descriptionVi": "Sau khi phán xét của bạn có hiệu lực, bạn có thể thu lấy kết quả phán xét."
  },
  "yiji": {
    "id": "yiji",
    "nameVi": "Di Kế",
    "descriptionVi": "Sau khi bạn nhận sát thương, bạn có thể xem 2 lá bài trên đầu chồng bài rút và giao cho tùy ý người."
  },
  "qingguo": {
    "id": "qingguo",
    "nameVi": "Khuynh Quốc",
    "descriptionVi": "Bạn có thể chuyển hóa sử dụng/đánh ra lá Đen trên tay thành [Thiểm]."
  },
  "luoshen": {
    "id": "luoshen",
    "nameVi": "Lạc Thần",
    "descriptionVi": "Khi bắt đầu giai đoạn chuẩn bị, bạn có thể phát động kỹ năng này, thực hiện lần lượt:\n- Bạn tiến hành phán Xét, nếu kết quả phán xét có màu Đen, bạn có thể lặp lại quá trình này;\n- Bạn thu lấy tất cả kết quả phán xét có màu Đen."
  },
  "shensu": {
    "id": "shensu",
    "nameVi": "Thần Tốc",
    "descriptionVi": "Nếu bạn thỏa mãn điều kiện sử dụng [Sát] (bỏ qua giới hạn khoảng cách), khi bạn tiến vào giai đoạn:\n* Phán xét: Bạn có thể bỏ qua giai đoạn này và giai đoạn rút bài;\n* Ra bài: Bạn có thể bỏ qua giai đoạn này và bỏ 1 lá trang bị;\n* Bỏ bài: Bạn có thể bỏ qua giai đoạn này và mất 1 máu;\n▷ Bạn xem như sử dụng [Sát] không giới hạn khoảng cách."
  },
  "qiaobian": {
    "id": "qiaobian",
    "nameVi": "Xảo Biến",
    "descriptionVi": "Khi tiến vào 1 giai đoạn trong lượt của bạn (Ngoại trừ giai đoạn chuẩn bị và kết thúc), bạn có thể bỏ 1 lá bài trên tay để bỏ qua giai đoạn này; sau đó nếu giai đoạn đã bỏ qua là:\n* Rút bài: Bạn có thể chọn tối đa 2 người có bài trên tay, bạn thu lấy 1 lá trên tay mỗi người;\n* Ra bài: Bạn có thể di chuyển 1 lá trên bàn chơi."
  },
  "duanliang": {
    "id": "duanliang",
    "nameVi": "Đoạn Lương",
    "descriptionVi": "Bạn có thể chuyển hóa sử dụng lá Đen không phải Công cụ thành [Binh Lương Thốn Đoạn] không giới hạn khoảng cách;\n▷ Nếu khoảng cách giữa bạn và mục tiêu > 2, bạn không thể phát động kỹ năng này trong giai đoạn này."
  },
  "jushou": {
    "id": "jushou",
    "nameVi": "Chiếm Thủ",
    "descriptionVi": "Khi bắt đầu giai đoạn kết thúc, bạn có thể rút X lá (X là số thế lực còn sống), thực hiện lần lượt:\n- Bạn sử dụng 1 trang bị trên tay hoặc bỏ 1 lá phi trang bị;\n- Nếu bạn rút > 2 lá, bạn thay đổi trạng thái chồng tướng."
  },
  "qiangxi": {
    "id": "qiangxi",
    "nameVi": "Cường Kích",
    "descriptionVi": "Một lần trong giai đoạn ra bài, bạn có thể chọn 1 người khác, bạn chọn bỏ 1 Vũ khí hoặc mất 1 máu, bạn gây 1 sát thương cho họ."
  },
  "quhu": {
    "id": "quhu",
    "nameVi": "Vờn Hổ",
    "descriptionVi": "Một lần trong giai đoạn ra bài, bạn có thể tiến hành đấu điểm với 1 người có số máu > bạn:\n* Nếu bạn thắng: Họ gây 1 sát thương cho 1 người trong tầm đánh của họ do bạn chỉ định;\n* Nếu bạn không thắng: Họ gây 1 sát thương cho bạn."
  },
  "jieming": {
    "id": "jieming",
    "nameVi": "Tiết Mệnh",
    "descriptionVi": "Sau khi bạn nhận sát thương, bạn có thể chọn 1 người, lệnh họ bổ sung bài trên tay đến giới hạn máu (Tối đa 5)."
  },
  "xingshang": {
    "id": "xingshang",
    "nameVi": "Hành Thương",
    "descriptionVi": "Khi 1 người khác trận vong, bạn có thể thu lấy tất cả bài của họ."
  },
  "fangzhu": {
    "id": "fangzhu",
    "nameVi": "Lưu Đày",
    "descriptionVi": "Sau khi bạn nhận sát thương, bạn có thể lệnh 1 người khác lựa chọn 1 mục:\n1. Họ rút X lá, sau đó thay đổi trạng thái chồng tướng;\n2. Họ bỏ X lá, sau đó mất 1 máu;\n(X là số máu đã mất của bạn)."
  },
  "xiaoguo": {
    "id": "xiaoguo",
    "nameVi": "Dũng Mãnh",
    "descriptionVi": "Khi bắt đầu giai đoạn kết thúc của 1 người khác, bạn có thể bỏ 1 lá cơ bản, lệnh họ chọn 1 mục:\n1. Họ bỏ 1 trang bị và lệnh bạn rút 1 lá;\n2. Bạn gây 1 sát thương cho họ."
  },
  "rende": {
    "id": "rende",
    "nameVi": "Nhân Đức",
    "descriptionVi": "Giai đoạn ra bài, bạn có thể đem tùy ý lượng bài trên tay giao cho 1 người khác chưa nhận bài từ kỹ năng này trong giai đoạn này;\n▷ Nếu đây là lần đầu tổng số lá bạn giao bằng kỹ năng này trong giai đoạn này ≥ 2, bạn có thể xem như sử dụng 1 lá cơ bản."
  },
  "wusheng": {
    "id": "wusheng",
    "nameVi": "Võ Thánh",
    "descriptionVi": "• Bạn có thể chuyển hóa sử dụng/đánh ra 1 lá Đỏ thành [Sát].\n• Lá [Sát] RÔ do bạn sử dụng không giới hạn khoảng cách."
  },
  "paoxiao": {
    "id": "paoxiao",
    "nameVi": "Bào Hao",
    "descriptionVi": "Tỏa định kỹ:\n• Bạn sử dụng lá [Sát] không giới hạn số lượng.\n• Khi bạn sử dụng [Sát] thứ 2 trong 1 lượt, bạn rút 1 lá."
  },
  "guanxing": {
    "id": "guanxing",
    "nameVi": "Quan Tinh",
    "descriptionVi": "Khi bắt đầu giai đoạn chuẩn bị, bạn có thể xem X lá bài trên đầu chồng bài rút (X là số người còn sống, tối đa 5), sau đó sắp xếp tùy ý những lá này lên đầu hoặc đáy chồng bài rút."
  },
  "kongcheng": {
    "id": "kongcheng",
    "nameVi": "Không Thành",
    "descriptionVi": "Tỏa định kỹ:\n• Khi bạn trở thành mục tiêu của [Sát]/[Quyết Đấu], nếu bạn không có bài trên tay, hủy bỏ mục tiêu đối với bạn.\n• Ngoài lượt của bạn, khi bạn nhận được bài do người khác giao cho, nếu bạn không có bài trên tay, đặt những lá bài này lên trên Tướng này, gọi là [Cầm];\n• Khi bắt đầu giai đoạn rút bài, bạn thu lấy tất cả lá [Cầm]."
  },
  "longdan": {
    "id": "longdan",
    "nameVi": "Long Đảm",
    "descriptionVi": "• Bạn có thể chuyển hóa sử dụng/đánh ra [Thiểm] thành [Sát];\n▶ Sau khi [Sát] này bị triệt tiêu bởi [Thiểm] của mục tiêu, bạn có thể gây 1 sát thương cho 1 người ngoại trừ mục tiêu.\n• Bạn có thể chuyển hóa sử dụng/đánh ra [Sát] thành [Thiểm];\n▶ Sau khi [Thiểm] này triệt tiêu [Sát] của 1 người, bạn có thể hồi 1 máu cho 1 người khác ngoại trừ người sử dụng [Sát]."
  },
  "tieqi": {
    "id": "tieqi",
    "nameVi": "Thiết Kỵ",
    "descriptionVi": "Sau khi bạn xác định mục tiêu của [Sát], ứng với mỗi mục tiêu, bạn có thể tiến hành phán xét, thực hiện lần lượt:\n- Vô hiệu hóa kỹ năng không phải Tỏa định kỹ của 1 tướng đã mở của mục tiêu trong lượt này;\n- Mục tiêu chọn bỏ 1 lá cùng chất với kết quả phán xét hoặc không thể sử dụng [Thiểm] để hưởng ứng [Sát] này."
  },
  "mashu": {
    "id": "mashu",
    "nameVi": "Mã Thuật",
    "descriptionVi": "Tỏa định kỹ: Khoảng cách từ bạn đến người khác -1."
  },
  "jizhi": {
    "id": "jizhi",
    "nameVi": "Tập Trí",
    "descriptionVi": "Khi bạn sử dụng công cụ phổ thông không phải chuyển hóa, bạn có thể rút 1 lá."
  },
  "qicai": {
    "id": "qicai",
    "nameVi": "Kỳ Tài",
    "descriptionVi": "Tỏa định kỹ: Công cụ bạn sử dụng không giới hạn khoảng cách."
  },
  "liegong": {
    "id": "liegong",
    "nameVi": "Liệt Cung",
    "descriptionVi": "• Lá [Sát] bạn sử dụng không giới hạn khoảng cách với mục tiêu có số bài trên tay ≤ bạn.\n• Sau khi bạn xác định từng mục tiêu của [Sát], nếu số máu của họ ≥ bạn, bạn có thể chọn 1 mục:\n1. Lệnh mục tiêu không thể sử dụng [Thiểm] để hưởng ứng [Sát] này;\n2. Lệnh cho sát thương từ hiệu quả của lá [Sát] này +1 đối với mục tiêu này."
  },
  "kuanggu": {
    "id": "kuanggu",
    "nameVi": "Cuồng Cốt",
    "descriptionVi": "Sau khi bạn gây sát thương cho 1 người, nếu khoảng cách từ bạn tới họ ≤1 trước khi máu giảm, ứng với mỗi sát thương, bạn có thể chọn 1 mục:\n1. Hồi 1 máu;\n2. Rút 1 lá."
  },
  "lianhuan": {
    "id": "lianhuan",
    "nameVi": "Liên Hoàn",
    "descriptionVi": "Giai đoạn ra bài, bạn có thể chuyển hóa sử dụng lá TÉP trên tay thành [Thiết Tác Liên Hoàn] hoặc Trùng Chú lá TÉP trên tay."
  },
  "niepan": {
    "id": "niepan",
    "nameVi": "Niết Bàn",
    "descriptionVi": "Hạn định kỹ: Khi bạn trong trạng thái hấp hối, bạn có thể phát động kỹ năng này, thực hiện lần lượt:\n- Bạn bỏ toàn bộ bài trong vùng chơi;\n- Bạn hồi máu đến 3 và rút 3 lá;\n- Bạn loại bỏ trạng thái xích và chồng tướng."
  },
  "huoji": {
    "id": "huoji",
    "nameVi": "Hỏa Kế",
    "descriptionVi": "Bạn có thể chuyển hóa sử dụng lá Đỏ trên tay thành [Hỏa Công]."
  },
  "kanpo": {
    "id": "kanpo",
    "nameVi": "Khán Phá",
    "descriptionVi": "Bạn có thể chuyển hóa sử dụng lá Đen trên tay thành [Vô Giải Khả Kích]."
  },
  "bazhen": {
    "id": "bazhen",
    "nameVi": "Bát Trận",
    "descriptionVi": "Tỏa định kỹ: Nếu vùng trang bị của bạn không có phòng cụ, bạn xem như có [Bát Quái Trận]."
  },
  "xiangle": {
    "id": "xiangle",
    "nameVi": "Hưởng Lạc",
    "descriptionVi": "Tỏa định kỹ: Sau khi bạn trở thành mục tiêu của [Sát], người sử dụng [Sát] chọn 1 mục:\n1. Họ bỏ 1 lá cơ bản;\n2. Lệnh [Sát] đó không có hiệu quả với bạn."
  },
  "fangquan": {
    "id": "fangquan",
    "nameVi": "Ủy Quyền",
    "descriptionVi": "Khi tiến vào giai đoạn ra bài, bạn có thể bỏ qua giai đoạn này;\n▶ Khi kết thúc lượt này, bạn có thể bỏ 1 lá bài trên tay, lệnh 1 người có 1 lượt sau lượt này."
  },
  "huoshou": {
    "id": "huoshou",
    "nameVi": "Họa Thủ",
    "descriptionVi": "Tỏa định kỹ:\n• [Nam Man Nhập Xâm] không có hiệu quả với bạn.\n• Sau khi 1 người khác xác định mục tiêu của [Nam Man Nhập Xâm], bạn trở thành nguồn sát thương của [Nam Man Nhập Xâm] này."
  },
  "zaiqi": {
    "id": "zaiqi",
    "nameVi": "Tái Khởi",
    "descriptionVi": "Khi kết thúc giai đoạn bỏ bài, bạn có thể chọn tối đa X người cùng thế lực (X là số lá Đỏ đã đi vào chồng bài bỏ trong lượt này), họ lựa chọn 1 mục:\n1. Họ rút 1 lá;\n2. Lệnh bạn hồi 1 máu."
  },
  "juxiang": {
    "id": "juxiang",
    "nameVi": "Cự Tượng",
    "descriptionVi": "Tỏa định kỹ:\n• [Nam Man Nhập Xâm] không có hiệu quả với bạn.\n• Sau khi [Nam Man Nhập Xâm] do người khác sử dụng kết toán xong, bạn thu lấy lá này."
  },
  "lieren": {
    "id": "lieren",
    "nameVi": "Liệt Nhận",
    "descriptionVi": "Sau khi bạn gây sát thương cho mục tiêu của [Sát], bạn có thể tiến hành đấu điểm với họ, nếu bạn thắng, bạn thu lấy 1 lá của mục tiêu."
  },
  "shushen": {
    "id": "shushen",
    "nameVi": "Thục Thận",
    "descriptionVi": "Sau khi bạn hồi máu, ứng với mỗi máu bạn đã hồi, bạn có thể lệnh 1 người khác rút 1 lá."
  },
  "shenzhi": {
    "id": "shenzhi",
    "nameVi": "Thần Trí",
    "descriptionVi": "Khi bắt đầu giai đoạn chuẩn bị, bạn có thể bỏ tất cả bài trên tay, nếu số lá đã bỏ ≥ số máu hiện tại của bạn, bạn hồi 1 máu."
  },
  "zhiheng": {
    "id": "zhiheng",
    "nameVi": "Chế Hành",
    "descriptionVi": "Một lần trong giai đoạn ra bài, bạn có thể bỏ tối đa X lá (X là giới hạn máu của bạn), bạn rút số lá tương ứng."
  },
  "qixi": {
    "id": "qixi",
    "nameVi": "Kỳ Tập",
    "descriptionVi": "Giai đoạn ra bài, bạn có thể chuyển hóa sử dụng lá Đen thành [Quá Hạ Sách Kiều]."
  },
  "keji": {
    "id": "keji",
    "nameVi": "Khắc Kỷ",
    "descriptionVi": "Tỏa định kỹ: Khi bắt đầu giai đoạn bỏ bài, nếu bạn trong giai đoạn ra bài không sử dụng các lá bài khác màu với nhau, giới hạn trữ bài của bạn trong lượt này +4."
  },
  "kurou": {
    "id": "kurou",
    "nameVi": "Khổ Nhục",
    "descriptionVi": "Một lần trong giai đoạn ra bài, bạn có thể bỏ 1 lá, thực hiện lần lượt:\n- Bạn mất 1 máu;\n- Bạn rút 3 lá;\n- Giới hạn sử dụng [Sát] của bạn trong giai đoạn này +1."
  },
  "yingzi": {
    "id": "yingzi",
    "nameVi": "Anh Tư",
    "descriptionVi": "Tỏa định kỹ:\n• Giai đoạn rút bài, bạn rút thêm 1 lá.\n• Giới hạn trữ bài của bạn bằng với giới hạn máu."
  },
  "fanjian": {
    "id": "fanjian",
    "nameVi": "Phản Gián",
    "descriptionVi": "Một lần trong giai đoạn ra bài, bạn có thể mở ra 1 lá bài trên tay và giao cho 1 người khác, bạn lệnh cho họ lựa chọn 1 mục:\n1. Nếu họ có bài trên tay hoặc có lá cùng chất với lá bạn đã mở trong vùng trang bị, họ mở ra tất cả bài trên tay và bỏ đi tất cả lá của họ có cùng chất với lá bạn đã mở ra;\n2. Họ mất 1 máu."
  },
  "guose": {
    "id": "guose",
    "nameVi": "Quốc Sắc",
    "descriptionVi": "Giai đoạn ra bài, bạn có thể chuyển hóa sử dụng lá RÔ thành [Lạc Bất Tư Thục]"
  },
  "liuli": {
    "id": "liuli",
    "nameVi": "Lưu Ly",
    "descriptionVi": "Khi bạn trở thành mục tiêu của [Sát], bạn có thể bỏ đi 1 lá, thay đổi mục tiêu của [Sát] này thành người khác trong tầm đánh của bạn (Không thể là người sử dụng [Sát] và người đã là mục tiêu của [Sát] này)."
  },
  "qianxun": {
    "id": "qianxun",
    "nameVi": "Khiêm Tốn",
    "descriptionVi": "Tỏa định kỹ:\n• Khi bạn trở thành mục tiêu của [Thuận Thủ Khiên Dương], hủy bỏ mục tiêu đối với bạn.\n• Khi [Lạc Bất Tư Thục] tiến vào vùng phán xét của bạn, đưa lá đó vào chồng bài bỏ."
  },
  "duoshi": {
    "id": "duoshi",
    "nameVi": "Độ Thế",
    "descriptionVi": "Bốn lần trong giai đoạn ra bài, bạn có thể chuyển hóa sử dụng bài Đỏ trên tay thành [Dĩ Dật Đãi Lao]."
  },
  "jieyin": {
    "id": "jieyin",
    "nameVi": "Kết Nhân",
    "descriptionVi": "Một lần trong giai đoạn ra bài, bạn có thể bỏ 2 lá trên tay và chọn 1 người có giới tính nam đang bị thương, bạn và họ hồi 1 máu."
  },
  "xiaoji": {
    "id": "xiaoji",
    "nameVi": "Kiêu Cơ",
    "descriptionVi": "Sau khi bạn mất bài trong vùng trang bị, bạn có thể:\n* Nếu đang là lượt của bạn, bạn rút 1 lá;\n* Nếu không phải lượt của bạn, bạn rút 3 lá."
  },
  "yinghun": {
    "id": "yinghun",
    "nameVi": "Anh Hồn",
    "descriptionVi": "Khi bắt đầu giai đoạn chuẩn bị, bạn có thể chọn 1 người khác và chọn 1 mục:\n1. Lệnh họ rút X lá sau đó bỏ 1 lá;\n2. Lệnh họ rút 1 lá sau đó bỏ X lá (X là số máu bạn đã mất)."
  },
  "tianxiang": {
    "id": "tianxiang",
    "nameVi": "Thiên Hương",
    "descriptionVi": "Hai lần trong lượt của mỗi người, khi bạn nhận sát thương, bạn có thể bỏ 1 lá CƠ trên tay và lựa chọn 1 người khác, bạn chặn sát thương này, sau đó bạn chọn 1 mục mà chưa chọn trong lượt này:\n1. Nếu sát thương này có nguồn, bạn lệnh nguồn sát thương gây 1 sát thương cho họ, sau đó họ rút X lá (X là số máu họ đã mất, tối đa 5);\n2. Lệnh họ mất 1 máu, sau đó họ thu lấy lá bạn vừa bỏ."
  },
  "hongyan": {
    "id": "hongyan",
    "nameVi": "Hồng Nhan",
    "descriptionVi": "Toả định kỹ:\n• Lá BÍCH của bạn và kết quả phán xét BÍCH của bạn xem như CƠ;\n• Nếu bạn có lá CƠ trong vùng trang bị, giới hạn trữ bài của bạn +1"
  },
  "tianyi": {
    "id": "tianyi",
    "nameVi": "Thiên Nghĩa",
    "descriptionVi": "Một lần trong giai đoạn ra bài, bạn có thể đấu điểm với 1 người:\n* Nếu bạn thắng: Trong lượt này, bạn sử dụng [Sát] không giới hạn khoảng cách; giới hạn sử dụng [Sát] và số mục tiêu của [Sát] +1;\n* Nếu bạn không thắng: Bạn không thể sử dụng [Sát] trong lượt này."
  },
  "buqu": {
    "id": "buqu",
    "nameVi": "Bất Khuất",
    "descriptionVi": "Tỏa định kỹ: Khi bạn trong trạng thái hấp hối, bạn mở 1 lá trên đầu chồng bài rút và đặt lên tướng này, gọi là [Sang], nếu [Sang] mới đặt so với những [Sang] khác:\n* Khác điểm: Bạn hồi máu đến 1;\n* Cùng điểm: Bạn đưa [Sang] này vào chồng bài bỏ."
  },
  "haoshi": {
    "id": "haoshi",
    "nameVi": "Hảo Thi",
    "descriptionVi": "Giai đoạn rút bài, bạn có thể rút thêm 2 lá;\n▶ Sau khi bạn rút bài, nếu số bài trên tay bạn > 5, bạn giao một nửa bài trên tay (làm tròn xuống) cho 1 người khác có số bài trên tay ít nhất."
  },
  "dimeng": {
    "id": "dimeng",
    "nameVi": "Kết Minh",
    "descriptionVi": "Một lần trong giai đoạn ra bài, bạn có thể chọn 2 người khác và bỏ đi X lá (X là số bài chênh lệch trên tay giữa 2 người), lệnh họ hoán đổi bài trên tay."
  },
  "zhijian": {
    "id": "zhijian",
    "nameVi": "Trực Gián",
    "descriptionVi": "Giai đoạn ra bài, bạn có thể đặt 1 trang bị trên tay vào vùng trang bị trống tương ứng của người khác, sau đó bạn rút 1 lá."
  },
  "guzheng": {
    "id": "guzheng",
    "nameVi": "Cổ Chính",
    "descriptionVi": "Khi kết thúc giai đoạn bỏ bài của người khác, bạn có thể giao cho họ 1 lá trong những lá đã bỏ đi trong giai đoạn này;\n▷ Bạn có thể thu lấy những lá còn lại."
  },
  "duanbing": {
    "id": "duanbing",
    "nameVi": "Đoản Binh",
    "descriptionVi": "Sau khi bạn chỉ định mục tiêu cho [Sát], bạn có thể chỉ định thêm 1 mục tiêu ở khoảng cách 1."
  },
  "fenxun": {
    "id": "fenxun",
    "nameVi": "Phấn Tấn",
    "descriptionVi": "Một lần trong giai đoạn ra bài, bạn có thể bỏ 1 lá và lựa chọn 1 người khác, khoảng cách từ bạn đến họ là 1 trong lượt này."
  },
  "jijiu": {
    "id": "jijiu",
    "nameVi": "Cấp Cứu",
    "descriptionVi": "Ngoài lượt của bạn, bạn có thể chuyển hóa sử dụng bài Đỏ thành [Đào]."
  },
  "qingnang": {
    "id": "qingnang",
    "nameVi": "Thanh Nang",
    "descriptionVi": "Một lần trong giai đoạn ra bài, bạn có thể bỏ 1 lá trên tay và chọn một người đã bị thương; người đó hồi 1 máu."
  },
  "wushuang": {
    "id": "wushuang",
    "nameVi": "Vô Song",
    "descriptionVi": "Tỏa định kỹ:\n• Sau khi bạn xác định mục tiêu của [Sát], ứng với mỗi mục tiêu, bạn lệnh họ cần sử dụng 2 [Thiểm] để triệt tiêu [Sát] này.\n• Sau khi bạn xác định mục tiêu của [Quyết Đấu] ứng với mỗi mục tiêu hoặc sau khi bạn trở thành mục tiêu của [Quyết Đấu], bạn lệnh người cùng bạn [Quyết Đấu] cần đánh ra 2 [Sát] mỗi lần để hưởng ứng.\n• Sau khi bạn lựa chọn mục tiêu cho [Quyết Đấu] phi chuyển hóa, bạn có thể lựa chọn thêm tối đa 2 người để trở thành mục tiêu."
  },
  "lijian": {
    "id": "lijian",
    "nameVi": "Ly Gián",
    "descriptionVi": "Một lần trong giai đoạn ra bài, bạn có thể bỏ 1 lá và lựa chọn 2 người khác có giới tính nam, lệnh người chọn sau xem như sử dụng [Quyết Đấu] với người chọn trước."
  },
  "biyue": {
    "id": "biyue",
    "nameVi": "Bế Nguyệt",
    "descriptionVi": "Khi bắt đầu giai đoạn kết thúc, bạn có thể rút 1 lá."
  },
  "luanji": {
    "id": "luanji",
    "nameVi": "Loạn Kích",
    "descriptionVi": "Giai đoạn ra bài, bạn có thể chuyển hóa sử dụng 2 lá trên tay thành [Vạn Tiễn Tề Phát];\n▷ Bạn không thể sử dụng [Vạn Tiễn Tề Phát] bằng cách này với lá thành phần cùng chất với những lá bạn đã sử dụng theo cách này trong lượt này;\n▶ Sau khi người cùng thế lực với bạn đánh ra [Thiểm] để hưởng ứng, họ có thể rút 1 lá."
  },
  "shuangxiong": {
    "id": "shuangxiong",
    "nameVi": "Song Hùng",
    "descriptionVi": "Giai đoạn rút bài, bạn có thể chọn không rút bài, bạn tiến hành phán xét;\n▶ Sau khi phán xét trên có hiệu lực, bạn thu lấy kết quả phán xét;\n▶ Trong lượt này, bạn có thể chuyển hóa sử dụng bài trên tay khác màu với kết quả phán xét trên thành [Quyết Đấu]."
  },
  "wansha": {
    "id": "wansha",
    "nameVi": "Hoàn Sát",
    "descriptionVi": "Tỏa định kỹ: Trong lượt của bạn, khi có người vào trạng thái hấp hối, bạn lệnh người khác không trong trạng thái hấp hối không thể sử dụng [Đào]."
  },
  "luanwu": {
    "id": "luanwu",
    "nameVi": "Loạn Vũ",
    "descriptionVi": "Hạn định kỹ: Giai đoạn ra bài, bạn có thể phát động kỹ năng này, lệnh tất cả người khác chọn 1 mục:\n1. Họ sử dụng [Sát] với người có khoảng cách nhỏ nhất;\n2. Họ mất 1 máu."
  },
  "weimu": {
    "id": "weimu",
    "nameVi": "Duy Mạc",
    "descriptionVi": "Tỏa định kỹ:\n• Khi bạn trở thành mục tiêu của công cụ phổ thông Đen, hủy bỏ mục tiêu đối với bạn.\n• Khi có lá Đen tiến vào vùng phán xét của bạn, đưa lá đó vào chồng bài bỏ."
  },
  "mengjin": {
    "id": "mengjin",
    "nameVi": "Mãnh Tiến",
    "descriptionVi": "Sau khi [Sát] của bạn bị mục tiêu dùng [Ngự] triệt tiêu, bạn có thể bỏ 1 lá của mục tiêu đó."
  },
  "leiji": {
    "id": "leiji",
    "nameVi": "Lôi Kích",
    "descriptionVi": "Khi bạn sử dụng/đánh ra [Thiểm], bạn có thể lệnh 1 người khác tiến hành phán xét, nếu kết quả phán xét có chất BÍCH, bạn gây 2 sát thương Lôi cho họ."
  },
  "guidao": {
    "id": "guidao",
    "nameVi": "Quỷ Đạo",
    "descriptionVi": "Khi phán xét của 1 người có hiệu lực, bạn có thể đánh ra 1 lá Đen để hoán đổi kết quả phán xét đó."
  },
  "beige": {
    "id": "beige",
    "nameVi": "Bi ca",
    "descriptionVi": "Sau khi 1 người nhận sát thương từ lá [Sát], bạn có thể bỏ 1 lá, lệnh họ tiến hành phán xét, nếu kết quả phán xét có chất:\n* CƠ: Họ hồi 1 máu;\n* RÔ: Họ rút 2 lá;\n* TÉP: Nguồn sát thương bỏ 2 lá;\n* BÍCH: Nguồn sát thương thay đổi trạng thái chồng tướng."
  },
  "duanchang": {
    "id": "duanchang",
    "nameVi": "Đoạn Trường",
    "descriptionVi": "Tỏa định kỹ: Khi bạn trận vong do người khác gây sát thương, bạn chọn 1 tướng của họ, lệnh họ mất đi kỹ năng của tướng đó."
  },
  "xiongyi": {
    "id": "xiongyi",
    "nameVi": "Hùng Dị",
    "descriptionVi": "Hạn định kỹ: Giai đoạn ra bài, bạn có thể phát động kỹ năng này, thực hiện lần lượt:\n- Lệnh tất cả người cùng thế lực với bạn rút 3 lá;\n- Nếu thế lực của bạn là một trong những thế lực ít người nhất, bạn hồi 1 máu."
  },
  "mingshi": {
    "id": "mingshi",
    "nameVi": "Danh Sĩ",
    "descriptionVi": "Tỏa định kỹ: Khi bạn tính toán sát thương phải nhận, nếu nguồn sát thương có tướng chưa mở, lệnh sát thương này -1."
  },
  "lirang": {
    "id": "lirang",
    "nameVi": "Lễ Nhượng",
    "descriptionVi": "Khi bài của bạn tiến vào chồng bài bỏ do bỏ bài, bạn có thể giao tùy ý cho những người khác."
  },
  "shuangren": {
    "id": "shuangren",
    "nameVi": "Song Nhận",
    "descriptionVi": "Khi bắt đầu giai đoạn ra bài, bạn có thể đấu điểm với 1 người:\n* Nếu bạn thắng: Bạn xem như sử dụng [Sát] với 1 người cùng thế lực với họ;\n* Nếu bạn không thắng: Bạn không thể chỉ định người khác làm mục tiêu sử dụng bài."
  },
  "sijian": {
    "id": "sijian",
    "nameVi": "Tử Gián",
    "descriptionVi": "Sau khi bạn mất đi lá cuối cùng trên tay, bạn có thể bỏ 1 lá của 1 người khác."
  },
  "suishi": {
    "id": "suishi",
    "nameVi": "Tùy Thế",
    "descriptionVi": "Tỏa định kỹ:\n• Khi người khác tiến trạng thái hấp hồi, nếu nguồn sát thương có cùng thế lực với bạn, bạn rút 1 lá.\n• Khi người khác có cùng thế lực với bạn trận vong, bạn mất 1 máu."
  },
  "kuangfu": {
    "id": "kuangfu",
    "nameVi": "Cuồng Phủ",
    "descriptionVi": "Một lần trong giai đoạn ra bài, sau khi bạn xác định mục tiêu của [Sát], bạn có thể thu lấy 1 trang bị của 1 trong các mục tiêu;\n▶ Sau khi kết toán xong [Sát] này, nếu [Sát] này không gây sát thương, bạn bỏ 2 lá trên tay."
  },
  "huoshui": {
    "id": "huoshui",
    "nameVi": "Họa Thủy",
    "descriptionVi": "Tỏa định kỹ: Trong lượt của bạn:\n• Người khác không thể mở tướng.\n• Khi bạn sử dụng [Sát] hoặc [Vạn Tiễn Tề Phát], mục tiêu của lá này không thể sử dụng hoặc đánh ra [Thiểm] để hưởng ứng."
  },
  "qingcheng": {
    "id": "qingcheng",
    "nameVi": "Khuynh Thành",
    "descriptionVi": "Giai đoạn ra bài, bạn có thể bỏ 1 lá Đen và chọn 1 người khác đã mở tất cả tướng, bạn úp 1 tướng của họ;\n▷ Nếu lá bạn bỏ là trang bị, bạn có thể chọn 1 người khác đã mở tất cả tướng, bạn úp 1 tướng của họ."
  }
};

export function getTamQuocSatGeneralInfo(cardId?: string): TamGeneralInfo | undefined {
  if (!cardId) return undefined;
  const generalId = cardId.startsWith("general-") ? cardId.slice("general-".length) : cardId;
  const general = tamQuocSatGeneralById.get(generalId);
  if (!general) return undefined;
  return { ...general, skills: (generalSkillIds[generalId] ?? []).map((id) => skillInfo[id]).filter(Boolean) };
}

