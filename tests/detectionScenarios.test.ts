import { describe, it, expect } from "vitest";
import { runTechnicalAnalysis, mergeRuleRiskWithAiResult } from "../src/utils/technicalAnalysis";
import { checkIndicator } from "../src/utils/indicatorLookup";
import { performTraceCheckSync } from "../src/utils/reputationService";
import { detectTyposquatting } from "../src/utils/indicatorLookup";
import { generateFallbackAnalysis } from "../server";
import { scanSevereDangerSigns } from "../src/utils/riskRules";

describe("Scam Detection & Security Rule Engine Unit Tests", () => {
  // 1. Tin nhắn an toàn thông thường
  it("Scenario 1: Benign friendly message should not be falsely escalated to HIGH/CRITICAL", () => {
    const text = "Trưa nay 12h đi ăn cơm với phòng nhé, quán cũ đầu ngõ.";
    const analysis = runTechnicalAnalysis({ text });
    expect(analysis.scoring.canonicalRiskLevel).toBe("SAFE");
    expect(analysis.scoring.totalScore).toBeLessThan(20);

    const merged = mergeRuleRiskWithAiResult(analysis, { aiRiskLevel: "SAFE" });
    expect(merged.finalRiskLevel).toBe("SAFE");
  });

  // 2. Tin nhắn có mã OTP + link mạo danh
  it("Scenario 2: OTP demand + suspicious link must be classified as HIGH or CRITICAL", () => {
    const text = "Tài khoản của bạn tạm khóa. Vui lòng nhập mã OTP và xác thực tại http://500001.eu.cc/dichvucong";
    const analysis = runTechnicalAnalysis({ text });
    expect(["HIGH", "CRITICAL"]).toContain(analysis.scoring.canonicalRiskLevel);
    expect(analysis.urlAnalysis.hasPathDeception).toBe(true);

    const merged = mergeRuleRiskWithAiResult(analysis, { aiRiskLevel: "SAFE" }); // Attempted AI downgrade
    // Non-downgrade rule prevents downgrading to SAFE
    expect(merged.finalRiskLevel).toBe("CRITICAL");
  });

  // 3. Tên miền ngẫu nhiên chưa ai báo cáo
  it("Scenario 3: Random domain without reports returns reportCount: null and honest disclaimer", () => {
    const randomUrl = "https://random-unknown-shop-12345.com";
    const check = checkIndicator(randomUrl);
    expect(check.communityReports.reportCount).toBeNull();
    expect(check.communityReports.message).toContain("Chưa kết nối nguồn dữ liệu phản ánh cộng đồng");
    expect(check.notableSigns.some((s) => s.includes("không chứng minh"))).toBe(true);
  });

  // 4. Tên miền cơ quan nhà nước (.gov.vn chuẩn)
  it("Scenario 4: Legitimate government domain (.gov.vn) is recognized as official and GREEN", () => {
    const officialUrl = "https://dichvucong.gov.vn";
    const check = checkIndicator(officialUrl);
    expect(check.warningLevel).toBe("GREEN");
    expect(check.urls[0].isOfficialVerified).toBe(true);
    expect(check.riskBadgeLabel).toContain("Đã xác minh");
  });

  // 5. Kẻ mạo danh công an nhưng dùng số nước ngoài (+212) hoặc link giả
  it("Scenario 5: Police impersonation with foreign phone triggers Identity Mismatch and CRITICAL risk", () => {
    const text = "Cục Cảnh sát Bộ Công An thông báo bạn có lệnh triệu tập điều tra, liên hệ lại ngay số +212612345678.";
    const analysis = runTechnicalAnalysis({ text });
    expect(analysis.identityMismatch.hasConflict).toBe(true);
    expect(analysis.phoneAnalysis.isForeignSenderWithVnIdentity).toBe(true);
    expect(analysis.scoring.canonicalRiskLevel).toBe("CRITICAL");
  });

  // 6. Typosquatting / domain nhái (bocongann.gov.vn)
  it("Scenario 6: Typosquatting detection catches lookalike domain bocongann.gov.vn", () => {
    const typoResult = detectTyposquatting("bocongann.gov.vn", "bocongann.gov.vn");
    expect(typoResult.isTyposquatting).toBe(true);
    expect(typoResult.targetOfficialDomain).toBe("bocongan.gov.vn");

    const check = checkIndicator("https://bocongann.gov.vn");
    expect(check.warningLevel).toBe("RED");
    expect(check.riskBadgeLabel).toBe("Nguy hiểm rõ ràng");
  });

  // 7. Nội dung mơ hồ thiếu thông tin
  it("Scenario 7: Ambiguous content asks clarifying questions instead of jumping to conclusions", () => {
    const text = "Có người tự xưng là shipper gọi điện thoại cho tôi";
    const analysis = runTechnicalAnalysis({ text });
    expect(analysis.scoring.canonicalRiskLevel).toBe("VERIFY");
    expect(analysis.skipFollowUpQuestions).toBe(false);
  });

  // 8. Gemini API timeout & Fallback
  it("Scenario 8: Deterministic fallback engine generates actionable results without AI", () => {
    const text = "Công an yêu cầu chuyển tiền phạt 2 triệu vào tài khoản cá nhân trong 24h.";
    const techAnalysis = runTechnicalAnalysis({ text });
    const ruleScan = scanSevereDangerSigns({ text, linkUrl: "" });
    const fallback = generateFallbackAnalysis({
      text,
      linkUrl: "",
      type: "text",
      techAnalysis,
      ruleScan,
      so_luot_da_hoi: 0,
    });
    expect(["HIGH", "CRITICAL"]).toContain(fallback.finalRiskLevel);
    expect(fallback.immediateActions.length).toBeGreaterThan(0);
    expect(fallback.viec_can_lam_ngay.length).toBeGreaterThan(0);
  });

  // 9. Kiểm tra tên miền .xyz ngẫu nhiên không có số lượt báo cáo giả
  it("Scenario 9: Random .xyz domain does NOT have fake report count, reportCount is null and status is unavailable", () => {
    const xyzUrl = "https://random-random-shop9999.xyz";
    const trace = performTraceCheckSync({ text: "", linkUrl: xyzUrl });
    expect(trace.hasReports).toBe(false);
    expect(trace.totalReportCount).toBeNull();
    expect(trace.domainItems[0].reportCount).toBeNull();
    expect(trace.communityReportResult.status).toBe("unavailable");
    expect(trace.communityReportResult.reportCount).toBeNull();
    expect(trace.communityReportResult.sourceUrl).toBeNull();
    expect(trace.communityReportResult.checkedAt).toBeNull();
    // Explanation must clarify it is a technical heuristic, not a proven report
    expect(trace.domainItems[0].reputationCategory?.toLowerCase()).toContain("tín hiệu kỹ thuật");
    expect(trace.lookupStatusText).toContain("Chưa kết nối nguồn dữ liệu phản ánh cộng đồng");
  });

  // 10. Không kết luận có số điện thoại hoặc quốc gia nếu input không chứa dữ liệu đó
  it("Scenario 10: Input without phone number returns 'Không có số điện thoại' and 'Không áp dụng'", () => {
    const textWithoutPhone = "Vui lòng xem thông báo mới nhất trên trang web nội bộ công ty.";
    const trace = performTraceCheckSync({ text: textWithoutPhone, linkUrl: "" });
    expect(trace.phoneItems).toHaveLength(0);
    expect(trace.searchedPhone).toBe("Không có số điện thoại");
    expect(trace.searchedCountryOrArea).toBe("Không áp dụng");
  });

  // 11. Strict Community Status semantics: verified vs not_found vs unavailable
  it("Scenario 11: Known threat database matches yield status 'verified' with reportCount > 0 and sourceUrl", () => {
    const knownThreatUrl = "https://500001.eu.cc/dichvucong";
    const trace = performTraceCheckSync({ text: "", linkUrl: knownThreatUrl });
    expect(trace.hasReports).toBe(true);
    expect(trace.totalReportCount).toBeGreaterThan(0);
    expect(trace.communityReportResult.status).toBe("verified");
    expect(trace.communityReportResult.reportCount).toBeGreaterThan(0);
    expect(trace.communityReportResult.sourceUrl).toBe("https://bocongan.gov.vn");
    expect(trace.communityReportResult.checkedAt).toBeTruthy();
  });
});
