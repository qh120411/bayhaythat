import { describe, it, expect } from "vitest";
import {
  sanitizeSensitiveData,
  detectCCCD,
  detectBankAccounts,
  detectCreditCards,
  detectOtpCodes,
  detectPhoneNumbers,
  getRedactionSummary,
} from "../src/utils/privacySanitizer";

describe("Privacy Sanitizer Unit Tests", () => {
  it("should detect and mask 12-digit CCCD with zero digits leaked", () => {
    const rawCccd = "001099012345";
    const text = `Số CCCD của tôi là ${rawCccd} cần xác thực gấp.`;
    const result = sanitizeSensitiveData(text);
    expect(result.sanitizedText).toContain("[CCCD ĐÃ ẨN]");
    expect(result.sanitizedText).not.toContain(rawCccd);
    expect(result.sanitizedText).not.toContain(rawCccd.substring(0, 4)); // "0010"
    expect(result.sanitizedText).not.toContain(rawCccd.substring(8)); // "2345"
    expect(result.redactionCount).toBe(1);
    expect(result.redactedItems[0].type).toBe("cccd");
  });

  it("should detect and mask OTP codes with context keywords", () => {
    const text = "Ma OTP xac thuc cua ban la 892341. Khong chia se cho bat ky ai.";
    const result = sanitizeSensitiveData(text);
    expect(result.sanitizedText).toContain("[MÃ OTP ĐÃ ẨN]");
    expect(result.sanitizedText).not.toContain("892341");
    expect(result.redactedItems.some((r) => r.type === "otp")).toBe(true);
  });

  it("should NOT mask currency amounts or years as OTP", () => {
    const text = "Tôi sinh năm 1995 và đã chuyển 500000 VNĐ tiền ăn trưa năm 2024.";
    const result = sanitizeSensitiveData(text);
    // 1995, 2024, 500000 should NOT be masked as OTP
    expect(result.sanitizedText).not.toContain("[MÃ OTP ĐÃ ẨN]");
    expect(result.sanitizedText).toContain("1995");
    expect(result.sanitizedText).toContain("2024");
  });

  it("should detect and mask credit card numbers (Visa/Mastercard)", () => {
    const text = "Thanh toán bằng thẻ 4111 2222 3333 4444 ngay bây giờ.";
    const result = sanitizeSensitiveData(text);
    expect(result.sanitizedText).toContain("[SỐ THẺ ĐÃ ẨN]");
    expect(result.sanitizedText).not.toContain("4111");
    expect(result.sanitizedText).not.toContain("4444");
    expect(result.redactedItems.some((r) => r.type === "credit_card")).toBe(true);
  });

  it("should detect and mask bank account numbers with context", () => {
    const text = "Chuyển tiền vào số tài khoản 19034567890123 ngân hàng Techcombank.";
    const result = sanitizeSensitiveData(text);
    expect(result.sanitizedText).toContain("[TÀI KHOẢN ĐÃ ẨN]");
    expect(result.sanitizedText).not.toContain("19034567890123");
    expect(result.sanitizedText).not.toContain("1903");
    expect(result.redactedItems.some((r) => r.type === "bank_account")).toBe(true);
  });

  it("should detect and mask sensitive phone numbers in text", () => {
    const text = "Số điện thoại riêng của tôi là 0912345678.";
    const result = sanitizeSensitiveData(text);
    expect(result.sanitizedText).toContain("[SỐ ĐIỆN THOẠI ĐÃ ẨN]");
    expect(result.sanitizedText).not.toContain("0912345678");
    expect(result.redactedItems.some((r) => r.type === "phone_number")).toBe(true);
  });

  it("should generate a clear redaction summary in Vietnamese", () => {
    const text = "CCCD: 001099012345, OTP: 654321, STK: 102938475610293";
    const result = sanitizeSensitiveData(text);
    const summary = getRedactionSummary(result.redactedItems);
    expect(summary).toContain("CCCD");
    expect(summary).toContain("Mã OTP");
  });

  it("should ensure raw CCCD, prefix, suffix and raw OTP are strictly absent from sanitized prompt payload", () => {
    const rawCccd = "001099012345";
    const rawOtp = "678901";
    const rawStk = "123456789012";
    const rawUserInput = `Tôi là Nguyen Van A, CCCD ${rawCccd}, mã OTP vừa nhận là ${rawOtp}, tài khoản ${rawStk}`;
    const sanitized = sanitizeSensitiveData(rawUserInput);

    // Raw sensitive numbers must NEVER be present in the sanitized string
    expect(sanitized.sanitizedText).not.toContain(rawCccd);
    expect(sanitized.sanitizedText).not.toContain(rawCccd.substring(0, 4));
    expect(sanitized.sanitizedText).not.toContain(rawCccd.substring(8));
    expect(sanitized.sanitizedText).not.toContain(rawOtp);
    expect(sanitized.sanitizedText).not.toContain(rawStk);

    // Masked placeholders must be completely digit-free
    expect(sanitized.sanitizedText).toContain("[CCCD ĐÃ ẨN]");
    expect(sanitized.sanitizedText).toContain("[MÃ OTP ĐÃ ẨN]");
    expect(sanitized.sanitizedText).toContain("[TÀI KHOẢN ĐÃ ẨN]");

    // Verify all placeholder tokens contain 0 digits (\d)
    const placeholders = sanitized.redactedItems.map((i) => i.placeholder);
    placeholders.forEach((ph) => {
      expect(/\d/.test(ph)).toBe(false);
    });
  });
});
