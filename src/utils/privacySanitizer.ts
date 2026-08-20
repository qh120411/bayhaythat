/**
 * Privacy Sanitizer Module for "Bẫy Hay Thật ?"
 * 
 * Protects user privacy by identifying and redacting sensitive PII & credentials
 * (CCCD/Citizen ID, OTP codes, credit/debit card numbers, bank account numbers, phone numbers)
 * BEFORE sending any payload to Gemini or logging.
 */

export interface DetectedSensitiveItem {
  type: "cccd" | "otp" | "credit_card" | "bank_account" | "phone_number" | "email";
  raw: string;
  placeholder: string;
  startIndex: number;
  endIndex: number;
  contextSnippet: string;
}

export interface SanitizeResult {
  sanitizedText: string;
  isSanitized: boolean;
  redactionCount: number;
  redactedItems: DetectedSensitiveItem[];
}

export interface PrivacySanitizeOptions {
  maskPhone?: boolean;
  maskEmail?: boolean;
}

/**
 * Luhn algorithm check for credit/debit card validation
 */
export function isValidLuhn(cardNumber: string): boolean {
  const clean = cardNumber.replace(/\D/g, "");
  if (clean.length < 13 || clean.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Detect sensitive data with contextual precision (avoids blindly masking years, amounts, order IDs)
 */
export function detectSensitiveData(
  text: string,
  options: PrivacySanitizeOptions = { maskPhone: true, maskEmail: true }
): DetectedSensitiveItem[] {
  if (!text || typeof text !== "string") return [];

  const items: DetectedSensitiveItem[] = [];
  const addedRanges: Array<{ start: number; end: number }> = [];

  const isOverlapping = (start: number, end: number) => {
    return addedRanges.some((r) => Math.max(r.start, start) < Math.min(r.end, end));
  };

  const addMatch = (
    type: DetectedSensitiveItem["type"],
    raw: string,
    placeholder: string,
    startIndex: number,
    endIndex: number
  ) => {
    if (isOverlapping(startIndex, endIndex)) return;
    addedRanges.push({ start: startIndex, end: endIndex });

    const snippetStart = Math.max(0, startIndex - 15);
    const snippetEnd = Math.min(text.length, endIndex + 15);
    const contextSnippet = text.substring(snippetStart, snippetEnd);

    items.push({
      type,
      raw,
      placeholder,
      startIndex,
      endIndex,
      contextSnippet,
    });
  };

  // 1. CREDIT/DEBIT CARD (13-19 digits, separated by spaces or dashes, Luhn validated or card context)
  const cardRegex = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11}|(?:[0-9]{4}[\s\-]){3}[0-9]{4})\b/g;
  let cardMatch: RegExpExecArray | null;
  while ((cardMatch = cardRegex.exec(text)) !== null) {
    const rawCard = cardMatch[0];
    const cleanNum = rawCard.replace(/[\s\-]/g, "");
    const contextAround = text.substring(Math.max(0, cardMatch.index - 30), Math.min(text.length, cardMatch.index + rawCard.length + 30));
    const hasCardContext = /(?:thẻ|card|visa|mastercard|jcb|atm|thanh\s+toán)/i.test(contextAround);
    if (isValidLuhn(cleanNum) || (cleanNum.length === 16 && hasCardContext)) {
      addMatch(
        "credit_card",
        rawCard,
        "[SỐ THẺ ĐÃ ẨN]",
        cardMatch.index,
        cardMatch.index + rawCard.length
      );
    }
  }

  // 2. CCCD / CITIZEN IDENTITY CARD (Exact 12 digits, valid VN province/gender/century code)
  // Format: 0 + 2-digit province code (01-96) + 1-digit century/gender (0-9) + 2-digit birth year + 6-digit random
  const cccdRegex = /\b(0[0-9]{2}[0-3][0-9]{2}[0-9]{6})\b/g;
  let cccdMatch: RegExpExecArray | null;
  while ((cccdMatch = cccdRegex.exec(text)) !== null) {
    const rawCccd = cccdMatch[1];
    addMatch(
      "cccd",
      rawCccd,
      "[CCCD ĐÃ ẨN]",
      cccdMatch.index,
      cccdMatch.index + rawCccd.length
    );
  }

  // 3. OTP CODES WITH CONTEXTUAL ANCHOR (4-8 digits near keywords like OTP, mã xác thực, mã xác nhận)
  const otpContextRegex = /(?:(?:mã\s+)?otp|mã\s+xác\s+(?:thực|nhận|minh)|mã\s+kích\s+hoạt|verification\s+code|auth\s+code)(?:[^\d\n]{0,35})([0-9]{4,8})\b/gi;
  let otpMatch: RegExpExecArray | null;
  while ((otpMatch = otpContextRegex.exec(text)) !== null) {
    const fullMatch = otpMatch[0];
    const otpCode = otpMatch[1];
    const codeIndex = otpMatch.index + fullMatch.lastIndexOf(otpCode);
    addMatch(
      "otp",
      otpCode,
      "[MÃ OTP ĐÃ ẨN]",
      codeIndex,
      codeIndex + otpCode.length
    );
  }

  // 4. BANK ACCOUNT NUMBER WITH CONTEXTUAL ANCHOR (STK, số tài khoản, tài khoản, acc no, 6-19 digits)
  const bankAccountContextRegex = /(?:(?:số\s+)?tài\s+khoản(?:\s+ngân\s+hàng)?|stk|số\s+tk|tk\s+ngân\s+hàng|acc(?:ount)?(?:\s+no)?)\s*[:=is\s\-–—]{1,8}([0-9]{6,19})\b/gi;
  let bankMatch: RegExpExecArray | null;
  while ((bankMatch = bankAccountContextRegex.exec(text)) !== null) {
    const fullMatch = bankMatch[0];
    const bankNum = bankMatch[1];
    const numIndex = bankMatch.index + fullMatch.lastIndexOf(bankNum);
    addMatch(
      "bank_account",
      bankNum,
      "[TÀI KHOẢN ĐÃ ẨN]",
      numIndex,
      numIndex + bankNum.length
    );
  }

  // 5. PHONE NUMBERS (Vietnam 10-digit 03x/05x/07x/08x/09x or international +...)
  if (options.maskPhone) {
    const phoneRegex = /(?:\+84|0)(?:3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}\b/g;
    let phoneMatch: RegExpExecArray | null;
    while ((phoneMatch = phoneRegex.exec(text)) !== null) {
      const rawPhone = phoneMatch[0];
      addMatch(
        "phone_number",
        rawPhone,
        "[SỐ ĐIỆN THOẠI ĐÃ ẨN]",
        phoneMatch.index,
        phoneMatch.index + rawPhone.length
      );
    }
  }

  // 6. EMAIL ADDRESSES
  if (options.maskEmail) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
    let emailMatch: RegExpExecArray | null;
    while ((emailMatch = emailRegex.exec(text)) !== null) {
      const rawEmail = emailMatch[0];
      addMatch(
        "email",
        rawEmail,
        "[EMAIL ĐÃ ẨN]",
        emailMatch.index,
        emailMatch.index + rawEmail.length
      );
    }
  }

  // Sort matches by start position in original string
  return items.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Replaces all detected sensitive items with standardized safe placeholders
 */
export function sanitizeSensitiveData(
  text: string,
  options: PrivacySanitizeOptions = { maskPhone: true, maskEmail: true }
): SanitizeResult {
  if (!text || typeof text !== "string") {
    return {
      sanitizedText: "",
      isSanitized: false,
      redactionCount: 0,
      redactedItems: [],
    };
  }

  const items = detectSensitiveData(text, options);
  if (items.length === 0) {
    return {
      sanitizedText: text,
      isSanitized: false,
      redactionCount: 0,
      redactedItems: [],
    };
  }

  let sanitized = "";
  let lastIndex = 0;

  for (const item of items) {
    sanitized += text.substring(lastIndex, item.startIndex);
    sanitized += item.placeholder;
    lastIndex = item.endIndex;
  }

  sanitized += text.substring(lastIndex);
  return {
    sanitizedText: sanitized,
    isSanitized: true,
    redactionCount: items.length,
    redactedItems: items,
  };
}

/**
 * Helper to get human-readable redaction summary
 */
export function getRedactionSummary(items: DetectedSensitiveItem[] | string): string {
  const list: DetectedSensitiveItem[] = Array.isArray(items) ? items : detectSensitiveData(items);
  if (list.length === 0) return "";

  const labels: string[] = [];
  if (list.some((i) => i.type === "cccd")) labels.push("CCCD/CMND (12 số)");
  if (list.some((i) => i.type === "otp")) labels.push("Mã OTP bảo mật");
  if (list.some((i) => i.type === "credit_card")) labels.push("Số thẻ ngân hàng");
  if (list.some((i) => i.type === "bank_account")) labels.push("Số tài khoản ngân hàng");
  if (list.some((i) => i.type === "phone_number")) labels.push("Số điện thoại cá nhân");
  if (list.some((i) => i.type === "email")) labels.push("Email");

  return `Đã tự động che ${list.length} mục thông tin nhạy cảm trước khi gửi tới AI: ${labels.join(", ")}.`;
}

// Named detect helpers for testing
export const detectCCCD = (text: string) => detectSensitiveData(text).filter((i) => i.type === "cccd");
export const detectOtpCodes = (text: string) => detectSensitiveData(text).filter((i) => i.type === "otp");
export const detectCreditCards = (text: string) => detectSensitiveData(text).filter((i) => i.type === "credit_card");
export const detectBankAccounts = (text: string) => detectSensitiveData(text).filter((i) => i.type === "bank_account");
export const detectPhoneNumbers = (text: string) => detectSensitiveData(text).filter((i) => i.type === "phone_number");
