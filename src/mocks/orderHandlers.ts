import { http, HttpResponse, delay } from "msw";
import type { CreateOrderBody, WalletProvider } from "@/types/order";
import type { Network } from "@/types/nft";
import { nfts } from "./store";
import { CartError, getCart, setCartOwner } from "./cartDb";
import * as db from "./orderDb";
import { getScenario } from "./scenario";
import { fakeHex } from "./utils";
import { authenticate } from "./auth";

function errorResponse(e: unknown) {
  if (e instanceof CartError) {
    return HttpResponse.json(
      {
        code: e.code,
        message: e.message,
        fields: e.fields,
        cart: e.status === 409 ? getCart(nfts) : undefined,
      },
      { status: e.status },
    );
  }
  throw e;
}

export const orderHandlers = [
  http.post("*/api/wallet/connect", async ({ request }) => {
    const a = await authenticate(request, true);
    if (a instanceof Response) return a;
    const { provider, network } = (await request.json()) as {
      provider: WalletProvider;
      network: Network;
    };
    await delay(900);
    if (getScenario() === "wallet-rejected") {
      return HttpResponse.json(
        { code: "WALLET_REJECTED", message: "A carteira recusou a conexão." },
        { status: 403 },
      );
    }
    return HttpResponse.json({
      address: `0x${fakeHex(provider + network, 40)}`,
      provider,
      network,
    });
  }),

  http.post("*/api/orders", async ({ request }) => {
    const a = await authenticate(request, true);
    if (a instanceof Response) return a;
    const key = request.headers.get("Idempotency-Key");
    if (!key) {
      return HttpResponse.json(
        {
          code: "IDEMPOTENCY_KEY_REQUIRED",
          message: "Chave de idempotência obrigatória.",
        },
        { status: 400 },
      );
    }
    const body = (await request.json()) as CreateOrderBody;
    await delay(400);
    setCartOwner(a.owner);
    try {
      const { order, created } = db.createOrder(nfts, a.user!.id, key, body);
      if (created && getScenario() === "timeout") await delay(12_000);
      return HttpResponse.json(order, { status: created ? 201 : 200 });
    } catch (e) {
      return errorResponse(e);
    }
  }),

  http.get("*/api/orders/:id", async ({ request, params }) => {
    const a = await authenticate(request, true);
    if (a instanceof Response) return a;
    await delay(200);
    setCartOwner(a.owner);
    try {
      return HttpResponse.json(
        db.getOrder(nfts, a.user!.id, String(params.id)),
      );
    } catch (e) {
      return errorResponse(e);
    }
  }),
];
