import { expect, test } from "@playwright/test";

test("desktop click-to-advance breathing", async ({ page }) => {
  await page.goto("/");

  const startButton = page.getByRole("button", { name: /start/i });
  await expect(startButton).toBeVisible();

  await startButton.click();
  const nextButton = page.getByRole("button", { name: /naechste phase/i });
  await expect(nextButton).toBeDisabled();

  await page.waitForTimeout(4200);
  await expect(nextButton).toBeEnabled();
  await nextButton.click();

  await page.waitForTimeout(4200);
  await nextButton.click();

  await page.waitForTimeout(6100);
  await expect(page.getByText(/zyklen: 1/i)).toBeVisible();
});

test("counselor flow transitions to request sent", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /find local counselor/i }).click();
  await page.getByLabel("PLZ").fill("10115");
  await page.getByRole("button", { name: /anfrage senden/i }).click();

  await expect(page.getByText(/request sent/i)).toBeVisible();
  await page.getByRole("button", { name: /continue breathing/i }).click();
  await expect(page.getByText(/zen mode aktiv/i)).toBeVisible();
});
