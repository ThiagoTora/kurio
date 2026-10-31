import { expect, test } from "@playwright/test";
import {
  addToCart,
  fillCheckout,
  login,
  placeOrder,
  reachCheckout,
  receiptDialog,
  waitForSocket,
} from "./helpers";

test("9a. preço alterado via Socket.IO durante o checkout exige nova confirmação", async ({
  page,
}) => {
  await page.goto("/");
  await login(page);
  await addToCart(page, "nft-2");
  await waitForSocket(page, "user");

  await page.getByRole("link", { name: "Conectar e finalizar" }).click();
  await fillCheckout(page);
  await placeOrder(page); // revisão aberta com a cotação antiga

  await page.evaluate(() => window.__kurio.setPrice("nft-2", "9.99"));

  // a interface informa, atualiza o resumo e fecha a revisão
  await expect(
    page.getByRole("status").filter({ hasText: "o preço mudou" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("alert").filter({ hasText: "mudaram" }),
  ).toBeVisible();
  await expect(page.getByText("9.99 ETH").first()).toBeVisible();
  await expect(page.locator('main form [name="email"]')).toHaveValue(
    "ana@kurio.dev",
  ); // contexto preservado

  // nova confirmação com os valores atuais (9.99 + taxa de rede 0.006)
  const review = await placeOrder(page);
  await review.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(receiptDialog(page)).toContainText("9.996 ETH", {
    timeout: 15_000,
  });
});

test("9b. edição esgotada via Socket.IO bloqueia a compra", async ({
  page,
}) => {
  await page.goto("/");
  await login(page);
  await addToCart(page, "nft-2");
  await waitForSocket(page);

  await page.evaluate(() => window.__kurio.setStock("nft-2", "1-50", 0));
  await expect(page.getByText(/Disponível agora: 0/)).toBeVisible();

  await page.getByRole("link", { name: "Conectar e finalizar" }).click();
  await expect(
    page.getByRole("button", { name: "Confirmar compra" }),
  ).toBeDisabled();
});

test("10a. eventos duplicados e antigos não reaplicam efeitos nem regridem o estado", async ({
  page,
}) => {
  await page.goto("/");
  await login(page);
  await addToCart(page, "nft-2");
  await waitForSocket(page);

  const notices = page.getByRole("status").getByRole("listitem");

  await page.evaluate(() => window.__kurio.setPrice("nft-2", "9.99"));
  await expect(notices).toHaveCount(1);
  await page.getByRole("button", { name: "Dispensar aviso" }).click();
  await expect(notices).toHaveCount(0);

  await page.evaluate(() => window.__kurio.replay("duplicate")); // mesmo id
  await page.evaluate(() => window.__kurio.replay("stale")); // versão antiga, preço 0.01

  // evento legítimo como barreira de ordenação: se houve reaplicação, haveria mais de 1 aviso
  await page.evaluate(() => window.__kurio.setPrice("nft-2", "8.88"));
  await expect(notices).toHaveCount(1);
  await expect(notices.first()).toContainText("8.88");
  await expect(page.getByText("0.01 ETH")).toHaveCount(0);
});

test("10b. queda de conexão com pedido pendente reconcilia sem criar outra compra", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const review = await reachCheckout(page, "slow-payment"); // pedido confirma em ~5 s
  await waitForSocket(page);
  await review.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(
    page.getByRole("heading", { name: "Processando pagamento..." }),
  ).toBeVisible();

  // a confirmação sai enquanto o cliente está offline (evento perdido)
  await page.evaluate(() => window.__kurio.disconnect(7000));
  await expect(page.locator("html")).toHaveAttribute(
    "data-socket",
    "disconnected",
  );

  await expect(receiptDialog(page)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("html")).toHaveAttribute(
    "data-socket",
    "connected",
    { timeout: 15_000 },
  );

  await page.goto("/order/ord-2");
  await expect(
    page.getByRole("heading", { name: "Pedido não encontrado" }),
  ).toBeVisible();
});

test("10c. recarregar com pedido pendente recupera o mesmo pedido", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const review = await reachCheckout(page, "slow-payment");
  await review.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page).toHaveURL(/\/order\/ord-1/);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Processando pagamento..." }),
  ).toBeVisible();
  await expect(receiptDialog(page)).toBeVisible({ timeout: 30_000 });
});
