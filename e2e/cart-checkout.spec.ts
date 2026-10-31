import { expect, test } from "@playwright/test";
import {
  USERS,
  addToCart,
  cartLink,
  fillCheckout,
  fillLoginDialog,
  login,
  placeOrder,
  reachCheckout,
  receiptDialog,
} from "./helpers";

test("5. quantidades, remoção, cupom e persistência após refresh e login", async ({
  page,
}) => {
  await addToCart(page, "nft-2");
  const qty = page
    .getByRole("group", { name: "Quantidade de Kurio #002" })
    .locator("output");

  await page
    .getByRole("button", { name: "Aumentar quantidade de Kurio #002" })
    .click();
  await expect(qty).toHaveText("2");

  // cupom inválido, expirado e válido
  const code = page.getByLabel("Código promocional");
  const apply = page.getByRole("button", { name: "Aplicar" });
  await code.fill("FOO");
  await apply.click();
  await expect(page.getByText("Cupom inválido.")).toBeVisible();
  await code.fill("VERAO24");
  await apply.click();
  await expect(page.getByText("Este cupom expirou.")).toBeVisible();
  await code.fill("KURIO10");
  await apply.click();
  await expect(page.getByText(/Cupom KURIO10 aplicado/)).toBeVisible();
  await expect(page.getByText("(-) 0.00")).toBeHidden(); // desconto aplicado

  // persiste após refresh
  await page.reload();
  await expect(qty).toHaveText("2");
  await expect(page.getByText(/Cupom KURIO10 aplicado/)).toBeVisible();

  // itens do visitante são preservados ao autenticar
  await login(page);
  await expect(cartLink(page, 2)).toBeVisible();
  await expect(qty).toHaveText("2");

  // remoção
  await page
    .getByRole("button", { name: "Remover Kurio #002 do carrinho" })
    .click();
  await expect(page.getByText("Seu carrinho está vazio.")).toBeVisible();
  await expect(cartLink(page, 0)).toBeVisible();
});

test("6. compra completa, do catálogo ao recibo confirmado", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".skeleton")).toHaveCount(0);
  await page
    .getByRole("link", { name: /Kurio #001/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Kurio #001" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "COMPRAR", exact: true }).click();
  await expect(page).toHaveURL(/\/cart$/);

  const total = (
    await page.getByRole("complementary").locator("dd").last().innerText()
  ).trim();

  // rota privada: volta ao início com o modal e, após o login, retorna ao checkout
  await page.getByRole("link", { name: "Conectar e finalizar" }).click();
  await expect(page.getByRole("dialog")).toContainText("Entre para continuar");
  await fillLoginDialog(page, USERS.ana);
  await expect(page).toHaveURL(/\/checkout/);

  await fillCheckout(page);
  const review = await placeOrder(page);
  await review.getByRole("button", { name: "Enviar pedido" }).click();

  await expect(
    page.getByRole("heading", { name: "Processando pagamento..." }),
  ).toBeVisible();
  const receipt = receiptDialog(page);
  await expect(receipt).toBeVisible({ timeout: 15_000 });
  await expect(receipt).toContainText("Kurio #001");
  await expect(receipt).toContainText(total);

  await receipt.getByRole("button", { name: "Fechar" }).click();
  await expect(cartLink(page, 0)).toBeVisible(); // itens comprados saíram do carrinho
});

test("7a. pagamento recusado preserva o carrinho", async ({ page }) => {
  const review = await reachCheckout(page, "declined");
  await review.getByRole("button", { name: "Enviar pedido" }).click();

  await expect(
    page.getByRole("heading", { name: "Pagamento recusado" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(receiptDialog(page)).toBeHidden(); // recibo só para pedido confirmado
  await expect(cartLink(page, 1)).toBeVisible();
});

test("7b. clique repetido não duplica o pedido", async ({ page }) => {
  const review = await reachCheckout(page);
  await review.getByRole("button", { name: "Enviar pedido" }).dblclick();

  await expect(receiptDialog(page)).toBeVisible({ timeout: 15_000 });
  await page.goto("/order/ord-2");
  await expect(
    page.getByRole("heading", { name: "Pedido não encontrado" }),
  ).toBeVisible();
});

test("7c. timeout após criar o pedido recupera o mesmo pedido por idempotência", async ({
  page,
}) => {
  const review = await reachCheckout(page, "timeout");
  await review.getByRole("button", { name: "Enviar pedido" }).click();

  await expect(review.getByRole("alert")).toContainText(
    "Não recebemos resposta do servidor",
  );
  await review.getByRole("button", { name: "Tentar novamente" }).click(); // mesma chave de idempotência

  await expect(page).toHaveURL(/\/order\/ord-1/);
  await expect(receiptDialog(page)).toBeVisible({ timeout: 15_000 });

  await page.goto("/order/ord-2"); // nenhuma segunda compra foi criada
  await expect(
    page.getByRole("heading", { name: "Pedido não encontrado" }),
  ).toBeVisible();
});
