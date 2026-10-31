import { expect, type Page } from "@playwright/test";

export const USERS = {
  ana: { email: "ana@kurio.dev", password: "Kurio@123", username: "ana" },
  bruno: { email: "bruno@kurio.dev", password: "Kurio@123", username: "bruno" },
};
export const WALLET_ADDRESS = `0x${"ab12".repeat(10)}`;

type User = { email: string; password: string; username: string };

export const cartLink = (page: Page, count: number) =>
  page.getByRole("link", { name: `Carrinho, ${count} itens`, exact: true });

export const receiptDialog = (page: Page) =>
  page.getByRole("dialog", { name: /agora estão na sua carteira/ });

export const waitForCatalog = (page: Page) =>
  expect(page.locator(".skeleton")).toHaveCount(0);

// o socket precisa estar conectado antes de disparar eventos
export async function waitForSocket(page: Page, as?: "user" | "guest") {
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-socket", "connected");
  await expect(html).toHaveAttribute("data-socket-ack", as ?? /^(user|guest)$/);
}
export async function fillLoginDialog(page: Page, user: User = USERS.ana) {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/^E-mail/).fill(user.email);
  await dialog.getByLabel(/^Senha/).fill(user.password);
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog).toBeHidden();
}

export async function login(page: Page, user: User = USERS.ana) {
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await fillLoginDialog(page, user);
  await expect(
    page.getByRole("link", { name: user.username, exact: true }),
  ).toBeVisible();
}

export async function logout(page: Page, username: string) {
  await page.getByRole("link", { name: username, exact: true }).click();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeVisible();
}

export async function addToCart(page: Page, nftId = "nft-2") {
  await page.goto(`/nft/${nftId}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "COMPRAR", exact: true }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(
    page.getByRole("group", { name: /^Quantidade de / }),
  ).toBeVisible();
}

export async function fillCheckout(page: Page, email = "ana@kurio.dev") {
  const f = (name: string) => page.locator(`main form [name="${name}"]`);
  await f("displayName").fill("Ana Souza");
  await f("username").fill("ana");
  await f("network").selectOption("ethereum");
  await f("profileName").fill("Ana Colecionadora");
  await f("walletAddress").fill(WALLET_ADDRESS);
  await f("walletType").selectOption("primary");
  await f("referralCode").fill("KURIO1");
  await f("email").fill(email);
  await f("ensName").fill("ana-kurio");
}

export async function placeOrder(page: Page) {
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  const review = page.getByRole("dialog", { name: "Revise seu pedido" });
  await expect(review).toBeVisible();
  return review;
}

// visitante -> login -> carrinho -> checkout preenchido -> diálogo de revisão aberto
export async function reachCheckout(page: Page, mock?: string) {
  await page.goto(mock ? `/?mock=${mock}` : "/");
  await login(page);
  await addToCart(page, "nft-2");
  await page.getByRole("link", { name: "Conectar e finalizar" }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await fillCheckout(page);
  return placeOrder(page);
}
