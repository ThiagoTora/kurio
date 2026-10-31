import { http, HttpResponse, delay } from "msw";
import type { Cart } from "@/types/cart";
import { nfts } from "./store";
import * as db from "./cartDb";
import { authenticate } from "./auth";

async function respond(request: Request, fn: () => Cart) {
  const a = await authenticate(request, false);
  if (a instanceof Response) return a;
  await delay(250);
  db.setCartOwner(a.owner); // fn é síncrona: sem corrida entre handlers
  try {
    return HttpResponse.json(fn());
  } catch (e) {
    if (e instanceof db.CartError) {
      return HttpResponse.json(
        { code: e.code, message: e.message },
        { status: e.status },
      );
    }
    throw e;
  }
}

export const cartHandlers = [
  http.get("*/api/cart", ({ request }) =>
    respond(request, () => db.getCart(nfts)),
  ),

  http.post("*/api/cart/items", async ({ request }) => {
    const body = (await request.clone().json()) as {
      nftId: string;
      editionId: string;
      quantity: number;
    };
    return respond(request, () => db.addItem(nfts, body));
  }),

  http.patch("*/api/cart/items/:itemId", async ({ request, params }) => {
    const { quantity } = (await request.clone().json()) as { quantity: number };
    return respond(request, () =>
      db.setQuantity(nfts, String(params.itemId), quantity),
    );
  }),

  http.delete("*/api/cart/items/:itemId", ({ request, params }) =>
    respond(request, () => db.removeItem(nfts, String(params.itemId))),
  ),

  http.put("*/api/cart/coupon", async ({ request }) => {
    const { code } = (await request.clone().json()) as { code: string };
    return respond(request, () => db.applyCoupon(nfts, code));
  }),

  http.delete("*/api/cart/coupon", ({ request }) =>
    respond(request, () => db.removeCoupon(nfts)),
  ),
];
