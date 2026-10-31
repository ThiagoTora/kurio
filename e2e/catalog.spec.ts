import { expect, test, type Locator, type Page } from "@playwright/test";
import { waitForCatalog } from "./helpers";

const cards = (page: Page) => page.getByRole("link", { name: /Kurio #\d+/ });
const priceOf = async (card: Locator) =>
  Number((await card.innerText()).match(/(\d+\.\d+) ETH/)?.[1]);

test("1. busca, filtros combinados, ...", async ({ page, isMobile }) => {
  const facet = async (name: RegExp) => {
    if (isMobile) await page.getByRole("button", { name: "Filtros" }).click();
    await page.getByRole("button", { name }).click();
    if (isMobile) await page.keyboard.press("Escape");
  };

  await page.goto("/");
  await waitForCatalog(page);
  await expect(cards(page)).toHaveCount(9);

  // busca: "#01" casa #010 a #019 (10 itens, 2 páginas)
  await page.getByRole("button", { name: "Abrir busca" }).click();
  await page.getByLabel("Buscar NFTs").fill("#01");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/q=/);
  await expect(cards(page)).toHaveCount(9);

  await page.getByRole("button", { name: "Página 2" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(cards(page)).toHaveCount(1);

  // mudar filtro reinicia a paginação
  await facet(/^Arte digital/);
  await expect(page).toHaveURL(/collection=arte-digital/);
  await expect(page).toHaveURL(/page=1/);
  await expect(cards(page)).toHaveCount(2);

  // ordenação
  await page.getByLabel("Ordenar por").selectOption("price_desc");
  await expect(page).toHaveURL(/sort=price_desc/);
  await expect(async () => {
    const a = await priceOf(cards(page).nth(0));
    const b = await priceOf(cards(page).nth(1));
    expect(a).toBeGreaterThanOrEqual(b);
  }).toPass();

  // filtro combinado (coleção + rede)
  await facet(/^Ethereum/);
  await expect(page).toHaveURL(/network=ethereum/);
  await expect(page).toHaveURL(/collection=arte-digital/);

  // histórico: volta 3 estados (rede -> ordenação -> coleção -> página 2)
  await page.goBack();
  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL(/page=2/);
  await expect(page).not.toHaveURL(/collection=/);
  await expect(cards(page)).toHaveCount(1);

  // refresh preserva o estado da URL
  await page.reload();
  await expect(cards(page)).toHaveCount(1);
});

test("1b. resultado vazio", async ({ page }) => {
  await page.goto("/?mock=nfts-empty");
  await expect(
    page.getByText("Nenhum NFT encontrado com esses filtros."),
  ).toBeVisible();
});

test("2. acesso direto ao detalhe, recurso inexistente e rota inexistente", async ({
  page,
}) => {
  await page.goto("/nft/nft-5");
  await expect(
    page.getByRole("heading", { level: 1, name: "Kurio #005" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "COMPRAR", exact: true }),
  ).toBeEnabled();

  await page.goto("/nft/nao-existe");
  await expect(
    page.getByRole("heading", { name: "NFT não encontrado" }),
  ).toBeVisible();

  await page.goto("/rota-inexistente");
  await expect(page.getByText("Página não encontrada.")).toBeVisible();
});

test.describe("12. carregamento lento, falha e recuperação", () => {
  test("skeletons com shimmer durante o carregamento lento", async ({
    page,
  }) => {
    await page.goto("/?mock=slow");
    const skeleton = page.locator(".skeleton").first();
    await expect(skeleton).toBeVisible();
    expect(
      await skeleton.evaluate((el) => getComputedStyle(el).animationName),
    ).not.toBe("none");

    await expect(page.locator(".skeleton")).toHaveCount(0, { timeout: 15_000 });
    await expect(cards(page)).toHaveCount(9);
  });

  test.describe("movimento reduzido", () => {
    test.use({ reducedMotion: "reduce" });
    test("o shimmer respeita prefers-reduced-motion", async ({ page }) => {
      await page.goto("/?mock=slow");
      const skeleton = page.locator(".skeleton").first();
      await expect(skeleton).toBeVisible();
      expect(
        await skeleton.evaluate((el) => getComputedStyle(el).animationName),
      ).toBe("none");
    });
  });

  test("falha da API mostra feedback e recupera com nova tentativa", async ({
    page,
  }) => {
    await page.goto("/?mock=nfts-error");
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Não foi possível carregar os NFTs." }),
    ).toBeVisible({ timeout: 15_000 }); // 2 retentativas do Query antes de exibir o erro

    await page.evaluate(() => window.__kurio.scenario("default"));
    await page.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(cards(page)).toHaveCount(9);
  });
});
