import { expect, test, type Page } from "@playwright/test";
import { addToCart, login } from "./helpers";

// 320 e 720 px aproximam zoom de 400% e 200% sobre 1280/1440
const WIDTHS = [320, 390, 720, 768, 1440];

async function assertNoHorizontalOverflow(page: Page, label: string) {
  await expect(page.locator(".skeleton")).toHaveCount(0);
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const bad = new Set<string>();
    document.querySelectorAll("body *").forEach((el) => {
      const b = el.getBoundingClientRect();
      if (
        b.width > 0 &&
        b.right > vw + 1 &&
        getComputedStyle(el).position !== "fixed"
      ) {
        bad.add(
          `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`,
        );
      }
    });
    return {
      overflow: document.documentElement.scrollWidth - vw,
      suspects: [...bad].slice(0, 8),
    };
  });
  expect(
    r.overflow,
    `${label}: suspeitos ${r.suspects.join(", ")}`,
  ).toBeLessThanOrEqual(0);
}

test.describe("sem overflow horizontal", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "o setViewportSize já cobre as larguras",
  );

  for (const width of WIDTHS) {
    test(`páginas públicas em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", "/nft/nft-1", "/cart"]) {
        await page.goto(path);
        await assertNoHorizontalOverflow(page, `${path} @${width}`);
      }
    });

    test(`carrinho, checkout e conta em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await login(page);
      await addToCart(page, "nft-2");
      await assertNoHorizontalOverflow(page, `/cart @${width}`);
      for (const path of ["/checkout", "/profile", "/wallets"]) {
        await page.goto(path);
        await expect(page.getByRole("main")).toBeVisible();
        await assertNoHorizontalOverflow(page, `${path} @${width}`);
      }
    });
  }
});

test.describe("mobile", () => {
  test.skip(({ isMobile }) => !isMobile, "somente no projeto mobile");

  test("menu abre, navega, fecha e devolve o foco", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Abrir menu" });
    await trigger.click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu.getByRole("link", { name: "Mercado" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await menu.getByRole("link", { name: "Mercado" }).click();
    await expect(menu).toBeHidden();
    await expect(page).toHaveURL(/#catalogo/);
  });

  test("filtros em drawer: abre, filtra e fecha", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("complementary", { name: "Filtros" }),
    ).toBeHidden(); // sidebar só no desktop
    await page.getByRole("button", { name: "Filtros" }).click();
    const drawer = page.getByRole("dialog", { name: "Filtros" });
    await drawer.getByRole("button", { name: /^Arte digital/ }).click();
    await expect(page).toHaveURL(/collection=arte-digital/);
    await drawer.getByRole("button", { name: /^Ver resultados/ }).click();
    await expect(drawer).toBeHidden();
  });
});
