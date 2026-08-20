import { test, expect } from "@playwright/test";

test.describe("Real Browser E2E Suite - Ai Riser / Bay Hay That", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Kiểm Tra Dấu Hiệu Lừa Đảo");
  });

  // Luồng 1: Tin nhắn bình thường → SAFE, không có dấu hiệu đe dọa bịa đặt
  test("Luồng 1: Tin nhắn bình thường sinh hoạt đời thường → SAFE", async ({ page }) => {
    const normalText = "Mẹ ơi, tối nay con về trễ khoảng 15 phút. Cơm ở trong nồi nhé.";

    await page.locator("#mode-select-text").click();
    await page.locator("#input-text-message").fill(normalText);
    await page.locator("#btn-submit-analyze").click();

    const resultCard = page.locator("#analysis-result-card");
    await expect(resultCard).toBeVisible({ timeout: 25000 });

    // 1. Kiểm tra nhãn & tiêu đề SAFE
    await expect(resultCard).toContainText("Chưa thấy dấu hiệu rủi ro rõ ràng");
    await expect(resultCard).toContainText("Chưa phát hiện dấu hiệu lừa đảo trong nội dung được cung cấp");

    // 2. Kiểm tra lời nhắc nhẹ nhàng
    await expect(resultCard).toContainText("Nếu nội dung hoặc yêu cầu thay đổi, hãy kiểm tra lại trước khi thực hiện giao dịch.");

    // 3. Đảm bảo KHÔNG xuất hiện cảnh báo khẩn cấp hoặc lệnh cấm không liên quan
    const cardText = await resultCard.innerText();
    expect(cardText).not.toContain("TUYỆT ĐỐI CẤM");
    expect(cardText).not.toContain("không bấm link");
    expect(cardText).not.toContain("không chuyển tiền");
    expect(cardText).not.toContain("Lệnh bắt");
    expect(cardText).not.toContain("bắt tạm giam");
    expect(cardText).not.toContain("rửa tiền");
  });

  // Luồng 2: Domain .xyz ngẫu nhiên → unavailable, không có số lượt giả
  test("Luồng 2: Domain .xyz ngẫu nhiên → status unavailable, không bịa số lượt báo cáo", async ({ page }) => {
    const randomUrl = "https://sale-shock-flash-999.xyz/deal";

    await page.locator("#mode-select-indicator").click();
    await page.locator("#input-indicator-quick").fill(randomUrl);
    await page.locator("#btn-submit-analyze").click();

    const indicatorCard = page.locator("#indicator-lookup-result-card");
    await expect(indicatorCard).toBeVisible({ timeout: 15000 });

    await expect(indicatorCard).toContainText(/Chưa kết nối nguồn dữ liệu phản ánh cộng đồng|Chưa có dữ liệu/i);
  });

  // Luồng 3: CCCD và OTP → chặn/quan sát request /api/analyze và xác nhận request body không chứa chữ số nhạy cảm
  test("Luồng 3: CCCD và OTP → request payload qua mạng bị che 100% chữ số nhạy cảm", async ({ page }) => {
    const rawCccd = "001099012345";
    const rawOtp = "892341";
    const rawInput = `Số CCCD của tôi là ${rawCccd}, mã OTP vừa gửi về là ${rawOtp}.`;

    let capturedPayload: any = null;

    await page.route("**/api/analyze", async (route) => {
      const request = route.request();
      capturedPayload = request.postDataJSON();
      await route.continue();
    });

    await page.locator("#mode-select-text").click();
    await page.locator("#input-text-message").fill(rawInput);
    await page.locator("#btn-submit-analyze").click();

    await page.waitForResponse((res) => res.url().includes("/api/analyze"), { timeout: 20000 });

    expect(capturedPayload).toBeTruthy();
    const sentText = capturedPayload.text || "";

    // Xác nhận không chứa bất kỳ chuỗi chữ số nhạy cảm nào
    expect(sentText).not.toContain(rawCccd);
    expect(sentText).not.toContain(rawOtp);
    expect(sentText).not.toContain("001099");
    expect(sentText).not.toContain("012345");
    expect(sentText).not.toContain("892341");

    // Xác nhận chứa placeholder đã che
    expect(sentText).toContain("[CCCD ĐÃ ẨN]");
    expect(sentText).toContain("[MÃ OTP ĐÃ ẨN]");
  });

  // Luồng 4: Backend trả 504 → loading kết thúc và có nút Thử lại
  test("Luồng 4: Backend trả 504 → loading kết thúc minh bạch và có nút Thử lại", async ({ page }) => {
    await page.route("**/api/analyze", async (route) => {
      await route.fulfill({
        status: 504,
        contentType: "application/json",
        body: JSON.stringify({ error: "Gateway Timeout" }),
      });
    });

    await page.locator("#mode-select-text").click();
    await page.locator("#input-text-message").fill("Kiểm tra xử lý lỗi mạng 504");
    await page.locator("#btn-submit-analyze").click();

    const errorBanner = page.locator("text=Máy chủ phản hồi mã lỗi 504").or(page.locator("text=Không thể kết nối"));
    await expect(errorBanner).toBeVisible({ timeout: 15000 });

    const retryBtn = page.getByRole("button", { name: /Thử lại/i });
    await expect(retryBtn).toBeVisible();

    const submitBtn = page.locator("#btn-submit-analyze");
    await expect(submitBtn).toBeEnabled();
  });

  // Luồng 5: Chuyển tab khi request đang chạy → không có banner lỗi ở màn hình luyện tập
  test("Luồng 5: Chuyển tab khi request đang chạy → không có banner lỗi ở màn hình luyện tập", async ({ page }) => {
    await page.route("**/api/analyze", async (route) => {
      await page.waitForTimeout(4000);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          muc_rui_ro: "Chưa thấy dấu hiệu rõ ràng",
          finalRiskLevel: "SAFE",
          giai_thich: "Phân tích an toàn",
          cac_dau_hieu: [],
          hanh_dong_an_toan: [],
          co_can_hoi_them: false,
          cau_hoi_bo_sung: [],
        }),
      });
    });

    await page.locator("#mode-select-text").click();
    await page.locator("#input-text-message").fill("Kiểm tra chuyển tab khi request đang chạy");
    await page.locator("#btn-submit-analyze").click();

    const practiceTabBtn = page.locator("#tab-practice-mode");
    await practiceTabBtn.click();

    await expect(page.locator("text=Tập Nhận Diện Bẫy Lừa Đảo")).toBeVisible({ timeout: 10000 });

    const errorBanner = page.locator("text=Quá trình phân tích mất nhiều thời gian").or(page.locator("text=Không thể kết nối"));
    await expect(errorBanner).not.toBeVisible();

    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  // Luồng 6: dichvucong.gov.vn → không có cụm “an toàn tuyệt đối”
  test("Luồng 6: dichvucong.gov.vn → nhận diện tên miền nhà nước và KHÔNG có cụm 'an toàn tuyệt đối'", async ({ page }) => {
    const govUrl = "https://dichvucong.gov.vn";

    await page.locator("#mode-select-indicator").click();
    await page.locator("#input-indicator-quick").fill(govUrl);
    await page.locator("#btn-submit-analyze").click();

    const indicatorCard = page.locator("#indicator-lookup-result-card");
    await expect(indicatorCard).toBeVisible({ timeout: 15000 });

    await expect(indicatorCard).toContainText(/Cơ quan chính phủ|dichvucong\.gov\.vn|Chính thống/i);

    const bodyText = await page.locator("body").innerText();
    expect(bodyText.toLowerCase()).not.toContain("an toàn tuyệt đối");
  });

  // Luồng 7: Reload → dữ liệu nhạy cảm không được phục hồi
  test("Luồng 7: Reload trang → form reset hoàn toàn, dữ liệu nhạy cảm không được phục hồi", async ({ page }) => {
    const sensitiveMessage = "CCCD 001099012345 và mã OTP 998877 trong tài khoản bí mật.";

    await page.locator("#mode-select-text").click();
    await page.locator("#input-text-message").fill(sensitiveMessage);

    await expect(page.locator("#input-text-message")).toHaveValue(sensitiveMessage);

    await page.reload();

    await expect(page.locator("#input-text-message")).toHaveValue("");
  });

  // Luồng 8: Hardening Security - Healthcheck tối giản và chặn 100% truy cập trực tiếp file nhạy cảm
  test("Luồng 8: Hardening Security - GET /health trả 200 tối giản và chặn file nhạy cảm", async ({ request }) => {
    // 1. Healthcheck tối giản
    const healthRes = await request.get("/health");
    expect(healthRes.status()).toBe(200);
    const healthJson = await healthRes.json();
    expect(healthJson).toEqual({ status: "ok" });

    // 2. Chặn các file mã nguồn, môi trường và sourcemaps
    const blockedPaths = [
      "/.env",
      "/.env.example",
      "/server.ts",
      "/server.cjs",
      "/dist/server.cjs",
      "/dist/server.cjs.map",
      "/package.json",
      "/tsconfig.json",
      "/Dockerfile",
    ];

    for (const p of blockedPaths) {
      const res = await request.get(p);
      expect(res.status()).toBe(404);
      const text = await res.text();
      expect(text).not.toContain("GEMINI_API_KEY");
      expect(text).not.toContain("import express");
    }
  });
});
