import { describe, it, expect } from "vitest";
import {
  runTechnicalAnalysis,
  extractAndNormalizePhoneNumbers,
  extractAndNormalizeUrls,
  mergeRuleRiskWithAiResult,
} from "./technicalAnalysis";
import { maxRisk, mapStringToCanonicalRisk } from "./riskConfig";
import { performTraceCheck } from "./reputationService";

describe("Systematic Technical Indicators Analysis", () => {
  it("should detect foreign sender +212 (Morocco)", () => {
    const text = "Từ số +212 612-345-678 thông báo phạt nguội";
    const phones = extractAndNormalizePhoneNumbers(text);
    expect(phones.length).toBeGreaterThan(0);
    expect(phones[0].countryCode).toBe("+212");
    expect(phones[0].countryName).toBe("Morocco (Ma-rốc)");
    expect(phones[0].isForeign).toBe(true);
    expect(phones[0].isVietnam).toBe(false);
  });

  it("should extract registrable domain eu.cc and detect path deception for dichvucong.gov/vn", () => {
    const url = "https://500001.eu.cc/dichvucong.gov/vn";
    const parsed = extractAndNormalizeUrls(url);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0].registrableDomain).toBe("eu.cc");
    expect(parsed[0].hasDeceptivePath).toBe(true);
  });

  it("should mark the exact mock scenario as CRITICAL risk level with identity mismatch", () => {
    const text =
      "Tin nhắn từ +212 612-345-678: [TTDLQG] Thong bao: Ho so DVC cua ban bi loi. Vui long truy cap https://500001.eu.cc/dichvucong.gov/vn de nop phat 200.000d trong 48h. Soan 1 de nhan link moi.";
    const analysis = runTechnicalAnalysis({
      text,
      linkUrl: "https://500001.eu.cc/dichvucong.gov/vn",
    });

    expect(analysis.phoneAnalysis.isForeignSenderWithVnIdentity).toBe(true);
    expect(analysis.urlAnalysis.hasPathDeception).toBe(true);
    expect(analysis.identityMismatch.hasConflict).toBe(true);
    expect(analysis.scoring.canonicalRiskLevel).toBe("CRITICAL");
    expect(analysis.scoring.totalScore).toBeGreaterThanOrEqual(70);
  });

  it("should enforce the non-downgrade rule even if AI returns SAFE", () => {
    const text =
      "Tin nhắn từ +212 612-345-678: [TTDLQG] nop phat https://500001.eu.cc/dichvucong.gov/vn";
    const tech = runTechnicalAnalysis({
      text,
      linkUrl: "https://500001.eu.cc/dichvucong.gov/vn",
    });

    const merged = mergeRuleRiskWithAiResult(tech, {
      aiRiskLevel: "SAFE",
      muc_rui_ro: "Chưa thấy dấu hiệu rõ ràng",
    });

    expect(merged.finalRiskLevel).toBe("CRITICAL");
    expect(merged.muc_rui_ro).not.toBe("Chưa thấy dấu hiệu rõ ràng");
    expect(merged.muc_rui_ro).toBe("Rủi ro rất cao");
  });

  it("correctly ranks risk levels", () => {
    expect(maxRisk("SAFE", "HIGH")).toBe("HIGH");
    expect(maxRisk("HIGH", "CRITICAL")).toBe("CRITICAL");
    expect(maxRisk("VERIFY", "SAFE")).toBe("VERIFY");
    expect(maxRisk("HIGH", "VERIFY")).toBe("HIGH");
  });

  it("should perform parallel trace check and extract reputation data accurately", async () => {
    const trace = await performTraceCheck({
      text: "Tin nhắn từ +212 612-345-678 giả mạo DVC",
      linkUrl: "https://500001.eu.cc/dichvucong.gov/vn",
    });

    expect(trace.searchedPhone).toContain("+212");
    expect(trace.searchedCountryOrArea).toContain("Ma-rốc");
    expect(trace.searchedRealDomain).toBe("eu.cc");
    expect(trace.hasReports).toBe(true);
    expect(trace.totalReportCount).toBeGreaterThan(0);
    expect(trace.reputationRisk).toBe("CRITICAL");
  });

  it("should return clean neutral status when no reports exist without green coloring", async () => {
    const trace = await performTraceCheck({
      text: "Xin chào bạn, hôm nay bạn thế nào?",
      linkUrl: "https://example.com/hello",
    });

    expect(trace.hasReports).toBe(false);
    expect(trace.totalReportCount).toBe(0);
    expect(trace.reputationRisk).toBe("SAFE");
    expect(trace.lookupStatusText).toContain("Chưa có bản ghi báo cáo trùng khớp");
  });
});
