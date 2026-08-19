// Helper to mask sensitive personal info (phone numbers, OTP codes, bank accounts, CCCD) in displays

export function maskSensitiveData(input: string): string {
  if (!input) return "";

  let result = input;

  // Mask 12-digit CCCD / Citizen ID
  result = result.replace(/\b(\d{4})\d{4}(\d{4})\b/g, "$1 **** $2");

  // Mask 6-digit OTP codes
  result = result.replace(/\b(mã\s+otp|mã\s+xác\s+thực|otp\s+là)\s*[:=]?\s*(\d{2})\d{2,4}(\d{2})\b/gi, "$1 $2**$3");

  // Mask 10-11 digit phone numbers
  result = result.replace(/\b(0[3|5|7|8|9]\d{1})\d{4}(\d{3})\b/g, "$1.****.$2");

  // Mask 9-16 digit bank accounts
  result = result.replace(/\b(stk|tài khoản|tk)\s*[:=]?\s*(\d{3,4})\d{4,8}(\d{3,4})\b/gi, "$1 $2****$3");

  return result;
}

export function truncateString(str: string, maxLength = 80): string {
  if (!str) return "";
  return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
}
