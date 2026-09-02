import { test, expect } from "@playwright/test";

test.describe("Student Journey E2E Tests", () => {
  // Test Guest User Journey
  test("should browse public curriculum and trigger redirect to register on locked course click", async ({ page }) => {
    // 1. Visit landing page
    await page.goto("http://localhost:3000/");
    await expect(page).toHaveTitle(/منصة الفيزياء/);

    // 2. Find and click curriculum preview button for 3rd Secondary stage
    const previewBtn = page.locator("a:has-text('معاينة المنهج والدروس المتاحة')").first();
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();

    // 3. Verify landing on the curriculum preview page
    await expect(page).toHaveURL(/.*\/curriculum\/.*/);

    // 4. Verify preview details are visible (Chapters/Lectures layout list)
    const curriculumTitle = page.locator("h2:has-text('الكورسات المتاحة بالصف')");
    await expect(curriculumTitle).toBeVisible();

    const lockedBadge = page.locator("span:has-text('مغلق')").first();
    await expect(lockedBadge).toBeVisible();

    // 5. Click "سجل لتفعيل الكورس" to trigger authentication redirect prompt
    const enrollBtn = page.locator("a:has-text('سجل لتفعيل الكورس')").first();
    await expect(enrollBtn).toBeVisible();
    await enrollBtn.click();

    // 6. Verify redirect flow points to register with target course redirectTo query param
    await expect(page).toHaveURL(/.*\/register\?redirectTo=.*/);
  });

  // Test Responsive viewports rendering
  const viewports = [
    { name: "Mobile", width: 375, height: 812 },
    { name: "Tablet", width: 768, height: 1024 },
    { name: "Desktop", width: 1280, height: 800 },
  ];

  for (const vp of viewports) {
    test(`should render responsive layout successfully on ${vp.name} viewport`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("http://localhost:3000/");

      // Check header or hero elements are visible
      const brandLogo = page.locator("header").first();
      await expect(brandLogo).toBeVisible();
    });
  }
});
