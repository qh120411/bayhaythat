import { DemoScenario } from "../types";

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "cap-cuu",
    title: "1. Mạo danh con cháu cấp cứu bệnh viện",
    tag: "Thao túng nỗi sợ tình thân",
    shortDesc: "Tin nhắn từ số lạ tự xưng bác sĩ/giáo viên báo con cháu bị tai nạn nguy kịch, đòi chuyển viện phí gấp vào tài khoản cá nhân.",
    senderName: "Bác sĩ Hùng - Cấp cứu BV Chợ Rẫy (Số lạ: 0912.839.xxx)",
    avatarIcon: "HeartPulse",
    victimScenario: "Bác đang ở nhà một mình thì nhận được tin nhắn dồn dập từ số lạ nói con trai đi làm bị tai nạn giao thông rất nặng, cần chuyển ngay 25 triệu để mổ gấp!",
    highlightWords: ["cấp cứu gấp", "hôn mê", "chuyển 25 triệu", "tài khoản bác sĩ", "không kịp nữa"],
    psychologicalTactic: "Đánh vào tình yêu thương ruột thịt và tạo tình trạng khẩn cấp đe dọa tính mạng để nạn nhân hoảng loạn, tê liệt khả năng suy nghĩ logic và không kịp gọi kiểm chứng cho con cháu.",
    quickRefusal: "Tôi đang gọi trực tiếp cho con tôi và người nhà gần bệnh viện để đến tận nơi đóng viện phí. Xin cảm ơn.",
    inputData: {
      type: "text",
      text: "ALO BÁC PHẢI MẸ CHÁU HOÀNG KHÔNG? Cháu Hoàng vừa bị tai nạn giao thông trên đường Cộng Hòa, hiện đang cấp cứu hôn mê tại Bệnh viện Chợ Rẫy. Bác sĩ yêu cầu nộp tạm ứng 25.000.000đ để mổ não gấp trong 15 phút tới nếu không sẽ nguy hiểm tính mạng! Bác chuyển ngay vào STK Bác sĩ trực: 1048829103 Vietinbank (Nguyễn Văn Hùng). CẦN GẤP LẮM BÁC ƠI KHÔNG KỊP NỮA ĐÂU!!",
    },
    mockResult: {
      finalRiskLevel: "HIGH",
      muc_rui_ro: "Rủi ro cao",
      ket_luan_ngan: "Có nhiều dấu hiệu đáng ngờ — không làm theo yêu cầu",
      title: "Có nhiều dấu hiệu đáng ngờ — không làm theo yêu cầu",
      badgeLabel: "Rủi ro cao",
      cac_dau_hieu: [
        "Tạo tình huống tai nạn, nguy kịch đến tính mạng để làm người nhà hoảng sợ tột độ.",
        "Ép buộc chuyển tiền trong thời gian cực ngắn ('trong 15 phút tới', 'không kịp nữa').",
        "Yêu cầu chuyển tiền vào số tài khoản cá nhân (tên cá nhân, không phải tài khoản chính thức bệnh viện).",
        "Nhắn từ số điện thoại lạ, không liên hệ được qua số của con cháu trước đó.",
      ],
      bang_chung: [
        "Trích đoạn: 'yêu cầu nộp tạm ứng 25.000.000đ để mổ não gấp trong 15 phút tới'",
        "Trích đoạn: 'chuyển ngay vào STK Bác sĩ trực: 1048829103 Vietinbank (Nguyễn Văn Hùng)'",
      ],
      giai_thich:
        "Bệnh viện tại Việt Nam luôn ưu tiên cấp cứu bệnh nhân trước trong tình huống nguy kịch và không bao giờ yêu cầu chuyển viện phí vào tài khoản cá nhân của bác sĩ qua tin nhắn điện thoại.",
      viec_can_lam_ngay: [
        "Hít thở sâu, giữ bình tĩnh, TUYỆT ĐỐI KHÔNG chuyển bất kỳ khoản tiền nào.",
        "Gọi điện thoại trực tiếp cho con/cháu (số điện thoại bình thường vẫn hay gọi).",
        "Nếu con chưa bắt máy, gọi ngay cho đồng nghiệp, bạn bè hoặc nơi làm việc/trường học của con.",
        "Gọi trực tiếp đến số tổng đài chính thức của Bệnh viện Chợ Rẫy (028.3855.4137) để kiểm tra danh sách tiếp nhận cấp cứu.",
      ],
      viec_khong_nen_lam: [
        "Không chuyển tiền vào tài khoản cá nhân người lạ cung cấp.",
        "Không tiếp tục nghe lời hối thúc giục giã của người gửi tin.",
        "Không tự ý đi rút tiền hoặc vay mượn người khác khi chưa xác thực được với con cháu.",
      ],
      thong_tin_can_xac_minh: [
        "Xác minh tình trạng thực tế của con/cháu qua số điện thoại thường dùng.",
        "Kiểm tra bệnh án tại phòng hành chính bệnh viện nếu có người nhà ở gần.",
      ],
      tin_nhan_tu_choi_goi_y:
        "Tôi đã liên hệ được với người nhà và đang có người thân trực tiếp tới viện. Tôi sẽ thanh toán viện phí trực tiếp tại quầy thu ngân của bệnh viện.",
      cau_hoi_xac_minh_goi_y:
        "Cháu Hoàng đi xe biển số bao nhiêu, mặc áo màu gì và hiện đang nằm ở phòng cấp cứu số mấy khoa nào?",
      noi_dung_gui_nguoi_than:
        "Con ơi, vừa có số lạ nhắn tin bảo con bị tai nạn cấp cứu ở Chợ Rẫy đòi chuyển 25 triệu. Con đọc tin nhắn này gọi lại cho bố/mẹ ngay nhé!",
      canh_bao_an_toan:
        "Bộ Y tế và Bộ Công an cảnh báo: Đây là thủ đoạn lừa đảo 'Con đang cấp cứu' đã khiến nhiều phụ huynh mất hàng trăm triệu đồng.",
    },
  },
  {
    id: "shipper-link",
    title: "2. Tin nhắn shipper giả mạo & link phạt phí",
    tag: "Phí nhỏ dẫn dụ chiếm đoạt tài khoản",
    shortDesc: "Tin nhắn tự xưng nhân viên giao hàng yêu cầu nộp 10.000đ - 20.000đ tiền lưu kho qua đường link lạ, dẫn đến trang web giả mạo ngân hàng.",
    senderName: "Giao Hàng Tiết Kiệm Alert (Số rác: 0899.123.xxx)",
    avatarIcon: "PackageCheck",
    victimScenario: "Khách hàng nhận được tin nhắn thông báo có bưu phẩm bị tồn đọng, cần thanh toán 15.000đ phí lưu kho qua link để không bị hủy đơn.",
    highlightWords: ["hủy đơn hàng", "phí lưu kho 15k", "bấm vào liên kết", "ghtk-giaohang-xacnhan.top", "trong 2 giờ"],
    psychologicalTactic: "Dùng số tiền rất nhỏ (vài chục nghìn) để nạn nhân mất cảnh giác, sẵn sàng nhấn vào đường link giả mạo cổng đăng nhập ngân hàng nhằm đánh cắp mật khẩu và mã OTP.",
    quickRefusal: "Tôi không đặt bưu phẩm này hoặc sẽ liên hệ trực tiếp tổng đài ứng dụng mua hàng để kiểm tra.",
    inputData: {
      type: "link",
      linkUrl: "http://ghtk-giaohang-xacnhan.top/tra-cuu-don/89201",
      text: "[GHTK THONG BAO]: Don hang ma #VN892017 cua quy khach bi giao khong thanh cong 2 lan. De tranh bi huy don va thanh ly hang, vui long truy cap: http://ghtk-giaohang-xacnhan.top/tra-cuu-don/89201 de thanh toan 15.000d phi luu kho trong 2 gio toi.",
    },
    mockResult: {
      finalRiskLevel: "HIGH",
      muc_rui_ro: "Rủi ro cao",
      ket_luan_ngan: "Có nhiều dấu hiệu đáng ngờ — không làm theo yêu cầu",
      title: "Có nhiều dấu hiệu đáng ngờ — không làm theo yêu cầu",
      badgeLabel: "Rủi ro cao",
      cac_dau_hieu: [
        "Đường link có đuôi lạ (.top), không phải tên miền chính thức của đơn vị vận chuyển (giaohangtietkiem.vn).",
        "Số tiền phí rất nhỏ (15.000đ) nhằm kích thích người dùng bấm vào link mà không đề phòng.",
        "Đe dọa 'hủy đơn và thanh lý hàng' nếu không nộp tiền trong 2 giờ.",
        "Tin nhắn không dấu, gửi từ số điện thoại cá nhân không có Brandname chính thức.",
      ],
      bang_chung: [
        "Tên miền đáng ngờ: 'http://ghtk-giaohang-xacnhan.top'",
        "Trích đoạn: 'thanh toan 15.000d phi luu kho trong 2 gio toi'",
      ],
      giai_thich:
        "Kẻ lừa đảo tạo trang web có giao diện giống hệt ngân hàng. Khi bạn nhập thông tin tài khoản và mã OTP để trả 15.000đ, kẻ xấu sẽ rút sạch toàn bộ tiền trong tài khoản của bạn.",
      viec_can_lam_ngay: [
        "TUYỆT ĐỐI KHÔNG nhấp vào đường link trong tin nhắn.",
        "Nếu đã lỡ nhấp vào link và nhập mật khẩu: Khóa thẻ/khóa tài khoản ngân hàng NGAY LẬP TỨC qua ứng dụng ngân hàng hoặc gọi tổng đài ngân hàng.",
        "Mở ứng dụng mua sắm (Shopee, Lazada, TikTok...) để kiểm tra xem mình có đơn hàng nào đang giao hay không.",
      ],
      viec_khong_nen_lam: [
        "Không điền số thẻ, tên đăng nhập, mật khẩu hay mã OTP vào trang web từ tin nhắn.",
        "Không chuyển tiền theo bất kỳ hướng dẫn nào từ đường link lạ.",
        "Không cài đặt bất kỳ tệp tin (.apk) nào nếu trang web yêu cầu tải về.",
      ],
      thong_tin_can_xac_minh: [
        "Mở ứng dụng mua hàng chính thức để tra cứu mã vận đơn thực tế.",
        "Tra cứu trên trang web chính thức của hãng vận chuyển bằng cách tự gõ địa chỉ trên trình duyệt.",
      ],
      tin_nhan_tu_choi_goi_y:
        "Tôi không có nhu cầu nhận đơn hàng này và sẽ khiếu nại qua ứng dụng chính thức.",
      cau_hoi_xac_minh_goi_y:
        "Người gửi hàng là ai, địa chỉ shop ở đâu và mã vận đơn trên hệ thống Shopee/Lazada là gì?",
      noi_dung_gui_nguoi_than:
        "Bố/Mẹ vừa nhận được tin nhắn shipper đòi nộp phí 15k qua link lạ này. Con kiểm tra giúp bố/mẹ xem có phải lừa đảo không nhé!",
      canh_bao_an_toan:
        "Cục An toàn thông tin (Bộ TT&TT) khuyến cáo: Các hãng giao hàng uy tín tại Việt Nam không bao giờ gửi link lạ bắt nạp tiền lưu kho qua tin nhắn SMS.",
    },
  },
  {
    id: "cong-an-video",
    title: "3. Video Call mạo danh Công an / Đòi mã OTP",
    tag: "Đe dọa pháp lý & Đánh cắp mã OTP",
    shortDesc: "Kẻ xấu mặc cảnh phục giả gọi video Zalo/FaceTime, dọa có lệnh bắt giam rửa tiền và ép đọc mã OTP hoặc chuyển tiền vào 'tài khoản điều tra'.",
    senderName: "Thiếu tá Trần Văn Minh - Phòng CSHS CATP (Zalo giả mạo)",
    avatarIcon: "ShieldAlert",
    victimScenario: "Người dùng nhận cuộc gọi video thấy người mặc sắc phục công an ngồi trước phông bạt cờ đỏ sao vàng, đe dọa tài khoản dính líu đến đường dây ma túy rửa tiền.",
    highlightWords: ["lệnh bắt giam", "rửa tiền ma túy", "tài khoản an toàn", "cung cấp mã OTP", "giữ bí mật tuyệt đối"],
    psychologicalTactic: "Lợi dụng sự kính trọng và e ngại quyền lực nhà nước, kết hợp kỹ xảo Deepfake/cảnh phục để đe dọa bắt bớ, buộc nạn nhân cô lập với người thân và răm rắp làm theo.",
    quickRefusal: "Tôi sẽ mang giấy tờ trực tiếp lên Công an Phường địa phương tôi cư trú để làm việc theo đúng quy định pháp luật.",
    inputData: {
      type: "police_call",
      text: "Đối phương gọi Zalo hiển thị hình ảnh người mặc trang phục công an, đọc đúng số CCCD và địa chỉ nhà của tôi. Nói rằng tài khoản ngân hàng của tôi đang dính vào vụ án buôn ma túy 50 tỷ của đường dây tội phạm quốc tế. Đã có lệnh bắt tạm giam từ Viện Kiểm Sát. Yêu cầu tôi phải tải ứng dụng 'Bộ Công An' để xác thực, đồng thời chuyển toàn bộ tiền tiết kiệm sang 'Tài khoản giám sát của cơ quan điều tra' để chứng minh trong sạch, và ĐẶC BIỆT KHÔNG ĐƯỢC KỂ VỚI BẤT KỲ AI.",
    },
    mockResult: {
      finalRiskLevel: "CRITICAL",
      muc_rui_ro: "Rủi ro rất cao",
      ket_luan_ngan: "Dừng lại ngay — không chuyển tiền, cung cấp OTP hoặc mở liên kết",
      title: "Dừng lại ngay — không chuyển tiền, cung cấp OTP hoặc mở liên kết",
      badgeLabel: "Nguy hiểm — dấu hiệu lừa đảo rõ ràng",
      cac_dau_hieu: [
        "Công an Việt Nam KHÔNG BAO GIỜ làm việc hay tống đạt lệnh bắt qua điện thoại, Zalo hay video call.",
        "Yêu cầu 'chuyển tiền vào tài khoản an toàn / tài khoản giám sát' là chiêu trò 100% lừa đảo.",
        "Ép buộc 'giữ bí mật tuyệt đối, không được nói cho người nhà' nhằm cô lập nạn nhân.",
        "Yêu cầu cài đặt ứng dụng lạ ngoài kho ứng dụng Google Play / App Store.",
      ],
      bang_chung: [
        "Trích đoạn: 'chuyển toàn bộ tiền tiết kiệm sang Tài khoản giám sát của cơ quan điều tra'",
        "Trích đoạn: 'ĐẶC BIỆT KHÔNG ĐƯỢC KỂ VỚI BẤT KỲ AI'",
        "Trích đoạn: 'yêu cầu tôi phải tải ứng dụng Bộ Công An'",
      ],
      giai_thich:
        "Cơ quan Công an, Viện Kiểm sát, Tòa án khi làm việc với công dân BẮT BUỘC phải gửi Giấy mời hoặc Giấy triệu tập trực tiếp qua Công an Xã/Phường địa phương, không bao giờ qua mạng xã hội.",
      viec_can_lam_ngay: [
        "CÚP MÁY NGAY LẬP TỨC và chặn tài khoản đối phương.",
        "Thông báo ngay cho người thân trong nhà để được trấn an và hỗ trợ.",
        "Nếu lo lắng, đi cùng người thân ra trực tiếp Trụ sở Công an Phường/Xã nơi cư trú để trình báo.",
      ],
      viec_khong_nen_lam: [
        "KHÔNG chuyển bất kỳ đồng tiền nào vào số tài khoản đối phương cung cấp.",
        "KHÔNG cài đặt ứng dụng theo đường link đối phương gửi.",
        "KHÔNG cung cấp mã OTP, mật khẩu tài khoản ngân hàng.",
        "KHÔNG giấu giếm gia đình.",
      ],
      thong_tin_can_xac_minh: [
        "Hỏi trực tiếp Cảnh sát khu vực quản lý địa bàn nơi bạn đang sinh sống.",
        "Đến trụ sở Công an quận/huyện để đối chiếu nếu có giấy triệu tập bằng văn bản giấy.",
      ],
      tin_nhan_tu_choi_goi_y:
        "Theo quy định của pháp luật, tôi yêu cầu gửi Giấy triệu tập chính thức về Công an Phường nơi tôi cư trú. Tôi sẽ đến trụ sở công an làm việc trực tiếp.",
      cau_hoi_xac_minh_goi_y:
        "Đồng chí công tác ở đội nào, số hiệu cán bộ bao nhiêu và Giấy triệu tập có dấu đỏ gửi qua đường bưu điện chưa?",
      noi_dung_gui_nguoi_than:
        "Con ơi, có người tự xưng công an gọi video đe dọa bắt bớ và đòi chuyển tiền. Bố/Mẹ đã cúp máy nhưng đang rất lo lắng, con sang với bố/mẹ hoặc gọi lại cho bố/mẹ nhé!",
      canh_bao_an_toan:
        "Bộ Công an chính thức khẳng định: Cơ quan công an các cấp KHÔNG có 'tài khoản an toàn' và KHÔNG làm việc qua mạng xã hội.",
    },
  },
];
