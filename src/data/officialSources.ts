// Danh mục các nguồn thông tin & Cổng tra cứu chính thức của Cơ quan Nhà nước Việt Nam
// bocongan.gov.vn là nguồn cảnh báo chính thống cao nhất của lực lượng Công an nhân dân

export interface OfficialSourceEntry {
  id: string;
  name: string;
  domain: string;
  url: string;
  authority: string;
  description: string;
  isPrimaryPolicePortal?: boolean;
}

export const OFFICIAL_GOVERNMENT_SOURCES: OfficialSourceEntry[] = [
  {
    id: "bocongan",
    name: "Cổng Thông tin điện tử Bộ Công an",
    domain: "bocongan.gov.vn",
    url: "https://bocongan.gov.vn",
    authority: "Bộ Công an",
    description:
      "Cổng thông tin chính thức của Bộ Công an, đăng tải các thông báo chính thức, tin cảnh báo thủ đoạn lừa đảo công nghệ cao và quyết định của lực lượng CAND.",
    isPrimaryPolicePortal: true,
  },
  {
    id: "cuccsgt",
    name: "Cục Cảnh sát Giao thông - Bộ Công an",
    domain: "cuccsgt.bocongan.gov.vn",
    url: "https://cuccsgt.bocongan.gov.vn",
    authority: "Bộ Công an",
    description: "Cổng thông tin tra cứu phạt nguội và cảnh báo mạo danh CSGT gọi điện tống tiền.",
  },
  {
    id: "baochinhphu",
    name: "Cổng Thông tin điện tử Chính phủ",
    domain: "baochinhphu.vn",
    url: "https://baochinhphu.vn",
    authority: "Văn phòng Chính phủ",
    description: "Cơ quan thông tin chính thức của Chính phủ nước CHXHCN Việt Nam trên Internet.",
  },
  {
    id: "dichvucong",
    name: "Cổng Dịch vụ công Quốc gia",
    domain: "dichvucong.gov.vn",
    url: "https://dichvucong.gov.vn",
    authority: "Văn phòng Chính phủ",
    description: "Cổng cung cấp dịch vụ công trực tuyến duy nhất của Chính phủ Việt Nam.",
  },
  {
    id: "cand",
    name: "Báo Công an Nhân dân",
    domain: "cand.com.vn",
    url: "https://cand.com.vn",
    authority: "Bộ Công an",
    description: "Cơ quan ngôn luận của Đảng ủy Công an Trung ương và Bộ Công an.",
  },
  {
    id: "congan_hanoi",
    name: "Công an Thành phố Hà Nội",
    domain: "congan.hanoi.gov.vn",
    url: "https://congan.hanoi.gov.vn",
    authority: "Công an TP. Hà Nội",
    description: "Cổng thông tin và cảnh báo thủ đoạn tội phạm tại địa bàn Thủ đô Hà Nội.",
  },
  {
    id: "congan_hcm",
    name: "Công an Thành phố Hồ Chí Minh",
    domain: "congan.hochiminhcity.gov.vn",
    url: "https://congan.hochiminhcity.gov.vn",
    authority: "Công an TP. Hồ Chí Minh",
    description: "Cổng thông tin và cảnh báo phòng chống tội phạm trên địa bàn TP. Hồ Chí Minh.",
  },
  {
    id: "tinnhiemmang",
    name: "Cổng Không gian mạng Quốc gia (Tín nhiệm mạng)",
    domain: "tinnhiemmang.vn",
    url: "https://tinnhiemmang.vn",
    authority: "Cục An toàn thông tin - Bộ TT&TT",
    description: "Hệ sinh thái tín nhiệm mạng giúp xác thực website chính thống và danh sách đen lừa đảo.",
  },
  {
    id: "vncert",
    name: "Trung tâm Ứng cứu khẩn cấp không gian mạng Việt Nam",
    domain: "vncert.vn",
    url: "https://vncert.vn",
    authority: "Cục An toàn thông tin - Bộ TT&TT",
    description: "Đầu mối tiếp nhận, điều phối và xử lý sự cố an toàn thông tin mạng quốc gia.",
  },
  {
    id: "gdt",
    name: "Tổng cục Thuế Việt Nam",
    domain: "gdt.gov.vn",
    url: "https://gdt.gov.vn",
    authority: "Bộ Tài chính",
    description: "Cổng thông tin ngành Thuế và cảnh báo ứng dụng thuế giả mạo cài mã độc.",
  },
];
