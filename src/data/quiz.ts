import { QuizItem } from "../types";

export const PRACTICE_QUIZZES: QuizItem[] = [
  {
    id: 1,
    tag: "Cuộc gọi video",
    scenarioText:
      "Có người gọi Zalo mặc quân phục Công an, ngồi trong phòng có cờ đỏ sao vàng, thông báo tài khoản của bạn liên quan đường dây buôn ma túy và yêu cầu chuyển tiền vào tài khoản tạm giữ để chứng minh vô tội.",
    sourceContext: "Cuộc gọi video Zalo từ số lạ tự xưng Công an hình sự",
    isScam: true,
    correctAnswerText: "Rất nguy hiểm (Có dấu hiệu lừa đảo)",
    keySigns: [
      "Gọi video call qua Zalo đe dọa án hình sự",
      "Yêu cầu chuyển tiền vào tài khoản tạm giữ/tài khoản an toàn",
      "Cấm không được nói cho người nhà",
    ],
    explanation:
      "Công an Việt Nam KHÔNG BAO GIỜ làm việc qua điện thoại, Zalo hay gọi video call. Mọi yêu cầu làm việc đều phải có Giấy mời hoặc Giấy triệu tập trực tiếp tại trụ sở Công an Xã/Phường.",
    goldenRule: "QUY TẮC VÀNG: Không có 'tài khoản an toàn của công an'. Nhận cuộc gọi tự xưng công an = Cúp máy ngay!",
  },
  {
    id: 2,
    tag: "Tin nhắn người thân",
    scenarioText:
      "Bạn nhận tin nhắn Messenger từ Facebook của đứa cháu ruột: 'Dì ơi, dì có tài khoản ngân hàng không chuyển giúp cháu 3 triệu vào STK này với, cháu đang kẹt tiền thanh toán gấp mà tài khoản cháu hết tiền'.",
    sourceContext: "Tin nhắn từ tài khoản mạng xã hội của cháu ruột",
    isScam: true,
    correctAnswerText: "Cần cảnh giác cao (Nguy cơ hack tài khoản)",
    keySigns: [
      "Nhắn tin mượn tiền qua mạng xã hội thay vì gọi điện thoại trực tiếp",
      "Số tài khoản thụ hưởng có tên người khác lạ",
      "Hối thúc cần gấp",
    ],
    explanation:
      "Kẻ xấu thường hack tài khoản Facebook/Zalo của người quen hoặc tạo tài khoản giả mạo giống hệt để nhắn tin mượn tiền khắp danh bạ bạn bè.",
    goldenRule: "QUY TẮC VÀNG: Thấy người quen mượn tiền qua mạng = Phải gọi điện thoại bằng số thường để nghe đúng giọng trước khi chuyển!",
  },
  {
    id: 3,
    tag: "Định danh VNeID",
    scenarioText:
      "Người tự xưng Cán bộ Công an Phường gọi điện báo: 'Tài khoản VNeID mức 2 của bác bị lỗi sai lệch thông tin CCCD, mời bác bấm vào link dịch-vụ-công-vneid.gov.vn.apk để tải ứng dụng về cập nhật trực tuyến'.",
    sourceContext: "Cuộc gọi hỗ trợ kích hoạt định danh VNeID",
    isScam: true,
    correctAnswerText: "Rất nguy hiểm (Chiêu trò cài mã độc chiếm máy)",
    keySigns: [
      "Gửi link lạ đuôi .apk để cài ứng dụng ngoài kho",
      "Hỗ trợ kích hoạt định danh điện tử từ xa qua mạng",
    ],
    explanation:
      "Cán bộ công an phường chỉ hướng dẫn người dân ra trụ sở công an trực tiếp để làm VNeID mức 2, không bao giờ gửi link đuôi .apk qua Zalo hay tin nhắn.",
    goldenRule: "QUY TẮC VÀNG: Tuyệt đối không bấm link đuôi .apk. Chỉ tải ứng dụng trên Google Play hoặc Apple App Store chính thức!",
  },
  {
    id: 4,
    tag: "Tin nhắn SMS ngân hàng",
    scenarioText:
      "Tin nhắn từ đầu số có tên 'VIETCOMBANK' thông báo: 'Phat hien dang nhap bat thuong tai Ha Noi. Neu khong phai quy khach, vui long truy cap https://vietcombank-xacminh.com de doi mat khau ngay lap tuc'.",
    sourceContext: "Tin nhắn SMS gửi vào hộp thư thương hiệu ngân hàng",
    isScam: true,
    correctAnswerText: "Rất nguy hiểm (Giả mạo Brandname SMS)",
    keySigns: [
      "Kẻ xấu dùng trạm phát sóng BTS giả chèn tin vào hộp thư ngân hàng",
      "Đường link không phải là tên miền chính thức của ngân hàng (.com.vn hoặc .vn)",
      "Đe dọa khóa tài khoản để ép bấm link",
    ],
    explanation:
      "Kẻ xấu sử dụng thiết bị phát sóng giả để mạo danh tên ngân hàng. Đường link dẫn đến trang web giả mạo nhằm lấy cắp Tên đăng nhập, Mật khẩu và Mã OTP.",
    goldenRule: "QUY TẮC VÀNG: Ngân hàng không bao giờ gửi tin nhắn kèm link bắt nhập mật khẩu. Hãy mở ứng dụng ngân hàng chính thức trên máy để kiểm tra!",
  },
  {
    id: 5,
    tag: "Thông báo tiền điện nước",
    scenarioText:
      "Tin nhắn từ Điện lực thông báo: 'Quy khach chua thanh toan tien dien thang 7 voi so tien 420.000d. Vui long thanh toan truoc ngay 20 de khong bi cat dien. Tra cuu tai app EVN hoac diem thu ho'.",
    sourceContext: "Tin nhắn thông báo cước định kỳ không kèm link chuyển tiền",
    isScam: false,
    correctAnswerText: "Chưa thấy dấu hiệu rủi ro (Thông báo tiền điện chuẩn)",
    keySigns: [
      "Chỉ nhắc hạn đóng cước định kỳ",
      "Không yêu cầu nạp tiền vào tài khoản cá nhân",
      "Không đính kèm link lạ độc hại, hướng dẫn tra cứu tại ứng dụng EVN chính thống",
    ],
    explanation:
      "Đây là tin nhắn nhắc cước tiền điện thông thường của ngành điện lực. Người dùng chỉ cần mở app EVN hoặc ứng dụng ngân hàng quen thuộc để kiểm tra hóa đơn.",
    goldenRule: "QUY TẮC VÀNG: Luôn thanh toán hóa đơn điện/nước qua app ngân hàng hoặc quầy giao dịch chính thống, không chuyển cho số tài khoản cá nhân lạ!",
  },
  {
    id: 6,
    tag: "Trúng thưởng tri ân",
    scenarioText:
      "Cuộc gọi tự xưng nhân viên sàn thương mại điện tử chúc mừng bạn may mắn trúng 01 tủ lạnh Samsung trị giá 15 triệu trong chương trình tri ân, yêu cầu bạn đóng trước 500.000đ tiền phí vận chuyển và bảo hiểm quà tặng.",
    sourceContext: "Cuộc gọi thông báo trúng thưởng tri ân bất ngờ",
    isScam: true,
    correctAnswerText: "Rất nguy hiểm (Bẫy trúng thưởng đòi tiền trước)",
    keySigns: [
      "Trúng thưởng lớn trong khi bạn không hề tham gia chương trình nào",
      "Đòi hỏi đóng tiền phí vận chuyển/thuế trước khi nhận quà",
    ],
    explanation:
      "Không có chương trình trúng thưởng chính thức nào bắt người nhận phải chuyển tiền trước vào tài khoản cá nhân để 'nhận quà'. Khi chuyển xong tiền cọc, kẻ xấu sẽ biến mất hoặc đòi thêm tiền phí.",
    goldenRule: "QUY TẮC VÀNG: Không có phần thưởng từ trên trời rơi xuống. Bất kỳ ai yêu cầu nộp tiền trước để nhận quà = 100% bẫy lừa đảo!",
  },
];
