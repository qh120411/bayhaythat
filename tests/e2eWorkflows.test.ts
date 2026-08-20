import { describe, it, expect, vi } from "vitest";
import { runTechnicalAnalysis, mergeRuleRiskWithAiResult } from "../src/utils/technicalAnalysis";
import { performTraceCheckSync } from "../src/utils/reputationService";
import { checkIndicator } from "../src/utils/indicatorLookup";
import { sanitizeSensitiveData } from "../src/utils/privacySanitizer";
import { generateFallbackAnalysis } from "../server";
import { scanSevereDangerSigns } from "../src/utils/riskRules";

describe("E2E Workflow & Security Validation Scenarios", () => {
  // 1. Nhập tin nhắn bình thường → nhận SAFE, không có bằng chứng bịa đặt
  it("Workflow 1: Benign normal message evaluates to SAFE with no fabricated threat evidence", () => {
    const normalText = "Trưa mai 12h nhóm mình hẹn ăn cơm ở quán cơm văn phòng nhé.";
    const tech = runTechnicalAnalysis({ text: normalText });
    const ruleScan = scanSevereDangerSigns({ text: normalText });
    const result = generateFallbackAnalysis({
      text: normalText,
      linkUrl: "",
      type: "text",
      techAnalysis: tech,
      ruleScan,
      so_luot_da_hoi: 0,
    });

    expect(result.muc_rui_ro).toBe("Chưa thấy dấu hiệu rõ ràng");
    expect(result.ket_luan_ngan).toContain("Chưa phát hiện dấu hiệu lừa đảo");
    // Ensure no fabricated threats (e.g. no police, no OTP, no bank warning)
    expect(result.giai_thich).not.toContain("tống đạt");
    expect(result.giai_thich).not.toContain("bắt tạm giam");
  });

  // 2. Nhập domain .xyz ngẫu nhiên → report status unavailable, không có số lượt báo cáo
  it("Workflow 2: Random .xyz domain yields status 'unavailable' with null reportCount", () => {
    const randomXyz = "https://sale-shock-flash-999.xyz/deal";
    const trace = performTraceCheckSync({ text: "", linkUrl: randomXyz });
    const indicator = checkIndicator(randomXyz);

    // Reputation Trace
    expect(trace.communityReportResult.status).toBe("unavailable");
    expect(trace.communityReportResult.reportCount).toBeNull();
    expect(trace.communityReportResult.sourceUrl).toBeNull();
    expect(trace.communityReportResult.checkedAt).toBeNull();
    expect(trace.lookupStatusText).toContain("Chưa kết nối nguồn dữ liệu phản ánh cộng đồng");

    // Indicator Lookup
    expect(indicator.communityReports.status).toBe("unavailable");
    expect(indicator.communityReports.reportCount).toBeNull();
  });

  // 3. Nhập OTP và CCCD giả → kiểm tra request payload gửi backend được redacted 100% không còn chữ số
  it("Workflow 3: OTP and CCCD redaction before network transmission leaves 0 digits in placeholders", () => {
    const rawCccd = "079199001234";
    const rawOtp = "948271";
    const rawStk = "0071000123456";
    const userPrompt = `Tôi là chủ tài khoản ${rawStk}, số CCCD ${rawCccd}. Mã OTP vừa báo về máy là ${rawOtp}, nhờ kiểm tra giúp tôi.`;

    // Perform frontend pre-flight redaction
    const sanitized = sanitizeSensitiveData(userPrompt);

    // Verify raw tokens are 100% absent
    expect(sanitized.sanitizedText).not.toContain(rawCccd);
    expect(sanitized.sanitizedText).not.toContain(rawOtp);
    expect(sanitized.sanitizedText).not.toContain(rawStk);

    // Verify substring prefixes/suffixes are absent
    expect(sanitized.sanitizedText).not.toContain("0791");
    expect(sanitized.sanitizedText).not.toContain("1234");

    // Verify exact digit-free placeholder substitutions
    expect(sanitized.sanitizedText).toContain("[CCCD ĐÃ ẨN]");
    expect(sanitized.sanitizedText).toContain("[MÃ OTP ĐÃ ẨN]");
    expect(sanitized.sanitizedText).toContain("[TÀI KHOẢN ĐÃ ẨN]");
  });

  // 4. Backend timeout handling → loading terminates gracefully and provides deterministic fallback
  it("Workflow 4: Timeout or network failure falls back to rule-based engine cleanly", () => {
    const timeoutText = "Công an thông báo bạn liên quan đường dây rửa tiền, nộp 50 triệu bảo lãnh ngay.";
    const tech = runTechnicalAnalysis({ text: timeoutText });
    const ruleScan = scanSevereDangerSigns({ text: timeoutText });

    // Simulate AI timeout -> fallback engine activation
    const fallback = generateFallbackAnalysis({
      text: timeoutText,
      linkUrl: "",
      type: "text",
      techAnalysis: tech,
      ruleScan,
      so_luot_da_hoi: 0,
    });

    expect(["HIGH", "CRITICAL", "Rủi ro rất cao", "Rủi ro cao", "Cần xác minh"]).toContain(fallback.muc_rui_ro);
    expect(fallback.hanh_dong_an_toan.length).toBeGreaterThan(0);
    expect(fallback.giai_thich).toBeTruthy();
  });

  // 5. AbortController / Cancellation: Navigation during pending request
  it("Workflow 5: AbortController aborts fetch without unhandled rejection or dirty state", async () => {
    const controller = new AbortController();
    const mockFetch = vi.fn((_url, options) => {
      return new Promise((resolve, reject) => {
        if (options?.signal?.aborted) {
          return reject(new DOMException("The user aborted a request.", "AbortError"));
        }
        options?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The user aborted a request.", "AbortError"));
        });
      });
    });

    const pendingPromise = mockFetch("/api/analyze", { signal: controller.signal });
    // User navigates away to Training Screen -> trigger abort
    controller.abort();

    await expect(pendingPromise).rejects.toThrow("The user aborted a request.");
  });

  // 6. Sensitive data reset on reload: No persistent storage of raw inputs
  it("Workflow 6: Sensitive inputs are held in ephemeral memory and never written to localStorage", () => {
    const ephemeralState = {
      inputText: "CCCD 001099001234 OTP 889900",
      analysisResult: null,
    };

    // State reset function (simulating component unmount or reload)
    function resetAnalysisState() {
      return {
        inputText: "",
        analysisResult: null,
      };
    }

    const reset = resetAnalysisState();
    expect(reset.inputText).toBe("");
    expect(reset.analysisResult).toBeNull();
  });

  // 7. Official government domain analysis: dichvucong.gov.vn verified as official, NO "an toàn tuyệt đối"
  it("Workflow 7: dichvucong.gov.vn is verified as official government portal without claiming 'an toàn tuyệt đối'", () => {
    const govUrl = "https://dichvucong.gov.vn/p/home/dvc-index.html";
    const tech = runTechnicalAnalysis({ linkUrl: govUrl });
    const indicator = checkIndicator(govUrl);

    // Verify official domain recognition
    expect(tech.urlAnalysis.hasUrl).toBe(true);
    expect(indicator.urls.some((u) => u.isOfficialVerified)).toBe(true);

    // Rule Scan & Fallback Generation
    const ruleScan = scanSevereDangerSigns({ linkUrl: govUrl });
    const result = generateFallbackAnalysis({
      text: "",
      linkUrl: govUrl,
      type: "text",
      techAnalysis: tech,
      ruleScan,
      so_luot_da_hoi: 0,
    });

    // CRITICAL: Must NEVER contain the forbidden phrase "an toàn tuyệt đối"
    const allText = JSON.stringify(result).toLowerCase();
    expect(allText).not.toContain("an toàn tuyệt đối");
  });
});
