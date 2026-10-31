import { expect, test } from "@playwright/test";
import {
  USERS,
  addToCart,
  cartLink,
  fillLoginDialog,
  login,
  logout,
} from "./helpers";

test("3a. cadastro com conflito, validação, sessão após refresh e logout", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Criar conta" }).first().click(); // aba

  // validação local
  await dialog.getByLabel(/^Nome de usuário/).fill("novo_user");
  await dialog.getByLabel(/^E-mail/).fill("novo@kurio.dev");
  await dialog.getByLabel(/^Senha/).fill("Senha1234");
  await dialog.getByLabel(/^Confirmar senha/).fill("Outra1234");
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog.getByText("As senhas não coincidem.")).toBeVisible();

  // conflito retornado pela API
  await dialog.getByLabel(/^Confirmar senha/).fill("Senha1234");
  await dialog.getByLabel(/^E-mail/).fill("ana@kurio.dev");
  await dialog.locator('button[type="submit"]').click();
  await expect(
    dialog.getByText("Este e-mail já está cadastrado."),
  ).toBeVisible();

  // sucesso
  await dialog.getByLabel(/^E-mail/).fill("novo@kurio.dev");
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("link", { name: "novo_user", exact: true }),
  ).toBeVisible();

  await page.reload(); // sessão recuperável após refresh
  await expect(
    page.getByRole("link", { name: "novo_user", exact: true }),
  ).toBeVisible();

  await logout(page, "novo_user");
});

test("3b. login com credenciais inválidas", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/^E-mail/).fill("ana@kurio.dev");
  await dialog.getByLabel(/^Senha/).fill("senha-errada1");
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog.getByText("E-mail ou senha incorretos.")).toBeVisible();
});

test("3c. troca de usuário limpa dados privados e isola os carrinhos", async ({
  page,
}) => {
  await page.goto("/");
  await login(page, USERS.ana);
  await addToCart(page, "nft-2");
  await expect(cartLink(page, 1)).toBeVisible();

  await logout(page, "ana");
  await expect(cartLink(page, 0)).toBeVisible(); // carrinho da Ana não vaza para o visitante

  await login(page, USERS.bruno);
  await expect(cartLink(page, 0)).toBeVisible(); // nem para outro usuário

  await logout(page, "bruno");
  await login(page, USERS.ana);
  await expect(cartLink(page, 1)).toBeVisible(); // o dela continua salvo
});

test("3d. expiração de sessão na navegação preserva o contexto e retoma após novo login", async ({
  page,
}) => {
  await page.goto("/");
  await login(page);
  await page.getByRole("link", { name: "ana", exact: true }).click(); // /profile
  await page.evaluate(() => window.__kurio.expireSession());

  await page.getByRole("link", { name: "Carteiras" }).click(); // primeira chamada privada recebe 401
  await expect(page.getByRole("dialog")).toContainText("Sua sessão expirou");
  await expect(page).toHaveURL(/\/wallets/); // continua na tela

  await fillLoginDialog(page, USERS.ana);
  await expect(
    page.getByRole("heading", { name: "Carteira principal" }),
  ).toBeVisible();
});

test("3e. sessão expira por tempo (TTL) usando o relógio controlado", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-07-29T12:00:00Z") });
  await page.goto("/");
  await login(page);
  await page.getByRole("link", { name: "ana", exact: true }).click();

  await page.clock.fastForward("31:00"); // TTL da sessão no mock é de 30 min
  await page.getByRole("link", { name: "Carteiras" }).click();
  await expect(page.getByRole("dialog")).toContainText("Sua sessão expirou");
});

test("4. favoritos persistem; falha da mutation faz rollback e recupera", async ({
  page,
}) => {
  await page.goto("/nft/nft-2");
  await login(page);
  const fav = page.getByRole("button", { name: /Favorit/ });

  await fav.click();
  await expect(fav).toHaveAttribute("aria-pressed", "true");
  await expect(fav).toHaveAttribute("aria-busy", "false"); // mutation concluída no servidor
  await page.reload();
  await expect(page.getByRole("button", { name: /Favoritado/ })).toBeVisible(); // persistiu

  await page.getByRole("button", { name: /Favoritar/ }).click();
  await expect(
    page.getByRole("button", { name: /Favoritado/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: /Favoritado/ })).toBeVisible(); // persistiu

  // falha: atualização otimista é revertida e o usuário é avisado
  await page.goto("/nft/nft-3?mock=favorite-fail");
  await page.getByRole("button", { name: /Favoritar/ }).click();
  await expect(
    page.getByText("Não foi possível atualizar seus favoritos."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Favoritar/ })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  // recuperação
  await page.evaluate(() => window.__kurio.scenario("default"));
  await page.getByRole("button", { name: /Favoritar/ }).click();
  await expect(page.getByRole("button", { name: /Favoritado/ })).toBeVisible();
});

test("11. teclado, foco do diálogo e validação de formulário", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");

  if (!isMobile) {
    await page.getByRole("link", { name: "KURIO" }).focus();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Início", exact: true }),
    ).toBeFocused();
  }

  // diálogo: foco entra, fica contido e volta ao gatilho ao fechar
  const trigger = page.getByRole("button", { name: "Entrar", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(
      () =>
        document.activeElement === document.body ||
        !!document.activeElement?.closest("dialog"),
    );
    expect(inside).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  // validação acessível: aria-invalid, descrição associada e foco no primeiro erro
  await trigger.click();
  await dialog.locator('button[type="submit"]').click();
  const email = dialog.getByLabel(/^E-mail/);
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAccessibleDescription("E-mail inválido.");
  await expect(email).toBeFocused();
});
