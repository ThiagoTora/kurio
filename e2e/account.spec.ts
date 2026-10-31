import { expect, test } from "@playwright/test";
import { USERS, WALLET_ADDRESS, login, logout } from "./helpers";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test("8a. perfil: validação, conflito da API, persistência e troca de senha", async ({
  page,
}) => {
  await page.goto("/");
  await login(page);
  await page.getByRole("link", { name: "ana", exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Perfil do colecionador" }),
  ).toBeVisible();

  const save = page.getByRole("button", { name: "Salvar", exact: true });
  const display = page.getByLabel(/^Nome de exibição/);
  const username = page.getByLabel(/^Nome de usuário/);

  await display.fill("");
  await save.click();
  await expect(page.getByText("Informe o nome de exibição.")).toBeVisible();

  await display.fill("Ana Souza");
  await username.fill("ab");
  await save.click();
  await expect(
    page.getByText("Use 3 a 20 letras, números ou _."),
  ).toBeVisible();

  await username.fill("bruno"); // conflito retornado pela API
  await save.click();
  await expect(page.getByText("Nome de usuário indisponível.")).toBeVisible();

  await username.fill("ana_k");
  await save.click();
  await expect(page.getByText("Alterações salvas.")).toBeVisible();
  await page.reload(); // permanece após refresh
  await expect(
    page.getByRole("link", { name: "ana_k", exact: true }),
  ).toBeVisible();

  // senha: atual incorreta, depois correta
  await page.getByLabel("Senha atual").fill("errada");
  await page.getByLabel("Nova senha", { exact: true }).fill("Novasenha1");
  await page.getByLabel("Confirmar nova senha").fill("Novasenha1");
  await save.click();
  await expect(page.getByText("Senha atual incorreta.")).toBeVisible();

  await page.getByLabel("Senha atual").fill(USERS.ana.password);
  await save.click();
  await expect(page.getByText("Alterações salvas.")).toBeVisible();

  await logout(page, "ana_k");
  await login(page, {
    ...USERS.ana,
    password: "Novasenha1",
    username: "ana_k",
  });
});

test("8b. avatar: envio, persistência, arquivo grande e remoção", async ({
  page,
}) => {
  await page.goto("/");
  await login(page);
  await page.goto("/profile");

  const input = page.locator('input[type="file"]');
  await input.setInputFiles({
    name: "a.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(page.getByRole("img", { name: /Avatar de/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("img", { name: /Avatar de/ })).toBeVisible();

  await input.setInputFiles({
    name: "grande.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(210 * 1024),
  });
  await expect(
    page.getByText("Imagem muito grande (máx. 200 KB)."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Remover", exact: true }).click();
  await expect(page.getByRole("img", { name: /Avatar de/ })).toBeHidden();
});

test("8c. carteiras: validação, erro da API, salvamento e secundária", async ({
  page,
}) => {
  await page.goto("/");
  await login(page);
  await page.goto("/wallets");
  await expect(
    page.getByRole("heading", { name: "Carteira principal" }),
  ).toBeVisible();

  const form = () => page.locator("main form").first();
  const f = (name: string) => form().locator(`[name="${name}"]`);

  await form().getByRole("button", { name: "Salvar carteira" }).click();
  await expect(form().getByText("Informe o nome de exibição.")).toBeVisible();
  await expect(form().getByText("Selecione uma rede.")).toBeVisible();

  await f("displayName").fill("Ana Souza");
  await f("nickname").fill("Principal");
  await f("network").selectOption("ethereum");
  await f("profileName").fill("Ana Colecionadora");
  await f("address").fill(WALLET_ADDRESS);
  await f("walletType").selectOption("primary");
  await f("referralCode").fill("INVALID"); // recusado pela API
  await f("email").fill("ana@kurio.dev");
  await f("ensName").fill("ana-kurio");
  await form().getByRole("button", { name: "Salvar carteira" }).click();
  await expect(
    form().getByText("Código de indicação inexistente."),
  ).toBeVisible();

  await f("referralCode").fill("KURIO1");
  await form().getByRole("button", { name: "Salvar carteira" }).click();
  await expect(form().getByText("Carteira salva.")).toBeVisible();

  await page.reload();
  await expect(f("address")).toHaveValue(WALLET_ADDRESS);

  await page.getByLabel("Igual à carteira principal").check();
  await expect(
    page.getByText("A carteira principal também será usada como secundária."),
  ).toBeVisible();
  const same = page.getByLabel("Igual à carteira principal");
  await same.click(); // o estado vem do servidor (assíncrono), então não use .check()
  await expect(same).toBeChecked();
  await expect(
    page.getByText("A carteira principal também será usada como secundária."),
  ).toBeVisible();
});
