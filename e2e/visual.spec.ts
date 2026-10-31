import { expect, test, type Page } from "@playwright/test";
import { addToCart, login } from "./helpers";

// força o carregamento de imagens lazy e fontes antes de capturar
async function stabilize(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
  await page.waitForFunction(() =>
    [...document.images].every((i) => i.complete && i.naturalWidth > 0),
  );
  await expect(page.locator(".skeleton")).toHaveCount(0);
}

test("início", async ({ page }) => {
  await page.goto("/");
  await stabilize(page);
  await expect(page).toHaveScreenshot("inicio.png", { fullPage: true });
});

test("detalhe do NFT", async ({ page }) => {
  await page.goto("/nft/nft-1");
  await expect(
    page.getByRole("heading", { level: 1, name: "Kurio #001" }),
  ).toBeVisible();
  await stabilize(page);
  await expect(page).toHaveScreenshot("detalhe.png", { fullPage: true });
});

test("carrinho", async ({ page }) => {
  await addToCart(page, "nft-1");
  await stabilize(page);
  await expect(page).toHaveScreenshot("carrinho.png", { fullPage: true });
});

test("pagamento", async ({ page }) => {
  await page.goto("/");
  await login(page);
  await addToCart(page, "nft-1");
  await page.getByRole("link", { name: "Conectar e finalizar" }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await stabilize(page);
  await expect(page).toHaveScreenshot("pagamento.png", { fullPage: true });
});
