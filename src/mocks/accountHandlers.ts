import { http, HttpResponse, delay } from "msw";
import { nfts, resetCatalog } from "./store";
import { CartError, mergeGuestCart, resetCart } from "./cartDb";
import { resetOrders } from "./orderDb";
import * as db from "./authDb";
import { authenticate } from "./auth";
import { getScenario } from "./scenario";

function fail(e: unknown) {
  if (e instanceof CartError) {
    return HttpResponse.json(
      { code: e.code, message: e.message, fields: e.fields },
      { status: e.status },
    );
  }
  throw e;
}

const guestOwner = (r: Request) =>
  `guest:${r.headers.get("X-Cart-Id") ?? "default"}`;

export const accountHandlers = [
  // sessão e conta
  http.post("*/api/auth/signup", async ({ request }) => {
    await db.ready;
    const body = (await request.json()) as {
      username: string;
      email: string;
      password: string;
    };
    await delay(500);
    try {
      const r = await db.signup(body);
      mergeGuestCart(nfts, guestOwner(request), `user:${r.user.id}`);
      return HttpResponse.json(r, { status: 201 });
    } catch (e) {
      return fail(e);
    }
  }),

  http.post("*/api/auth/login", async ({ request }) => {
    await db.ready;
    const body = (await request.json()) as { email: string; password: string };
    await delay(500);
    try {
      const r = await db.login(body.email, body.password);
      mergeGuestCart(nfts, guestOwner(request), `user:${r.user.id}`);
      return HttpResponse.json(r);
    } catch (e) {
      return fail(e);
    }
  }),

  http.get("*/api/auth/session", async ({ request }) => {
    const a = await authenticate(request, true);
    if (a instanceof Response) return a;
    return HttpResponse.json({ user: a.user });
  }),

  http.post("*/api/auth/logout", async ({ request }) => {
    await db.ready;
    const h = request.headers.get("Authorization");
    if (h?.startsWith("Bearer ")) db.logout(h.slice(7));
    return new HttpResponse(null, { status: 204 });
  }),

  // perfil
  http.patch("*/api/profile", async ({ request }) => {
    const a = await authenticate(request, true);
    if (a instanceof Response) return a;
    const body = (await request.json()) as Parameters<
      typeof db.updateProfile
    >[1];
    await delay(400);
    try {
      return HttpResponse.json(db.updateProfile(a.user!.id, body));
    } catch (e) {
      return fail(e);
    }
  }),

  http.put("*/api/profile/avatar", async ({ request }) => {
    const a = await authenticate(request, true);
    if (a instanceof Response) return a;
    const { dataUrl } = (await request.json()) as { dataUrl: string };
    await delay(400);
    try {
      return HttpResponse.json(db.setAvatar(a.user!.id, dataUrl));
    } catch (e) {
      return fail(e);
    }
  }),

  http.delete("*/api/profile/avatar", async ({ request }) => {
    const a = await authenticate(request, true);
    if (a instanceof Response) return a;
    return HttpResponse.json(db.setAvatar(a.user!.id, null));
  }),

  http.post("*/api/profile/password", async ({ request }) => {
    const a = await authenticate(request, true);
    if (a instanceof Response) return a;
    const body = (await request.json()) as {
      currentPassword: string;
      newPassword: string;
    };
    await delay(500);
    try {
      await db.changePassword(a.user!.id, body);
      return new HttpResponse(null, { status: 204 });
    } catch (e) {
      return fail(e);
    }
  }),

  // favoritos
  http.get("*/api/favorites", async ({ request }) => {
    const a = await authenticate(request, true);
    if (a instanceof Response) return a;
    await delay(200);
    return HttpResponse.json({ ids: db.getFavorites(a.user!.id) });
  }),

  http.put("*/api/favorites/:nftId", async ({ request, params }) => {
    const a = await authenticate(request, true);
    if (a instanceof Response) return a;
    await delay(300);
    if (getScenario() === "favorite-fail") {
      return HttpResponse.json(
        { code: "INTERNAL", message: "Falha transitória." },
        { status: 500 },
      );
    }
    return HttpResponse.json({
      ids: db.setFavorite(a.user!.id, String(params.nftId), true),
    });
  }),

  http.delete("*/api/favorites/:nftId", async ({ request, params }) => {
    const a = await authenticate(request, true);
    if (a instanceof Response) return a;
    await delay(300);
    if (getScenario() === "favorite-fail") {
      return HttpResponse.json(
        { code: "INTERNAL", message: "Falha transitória." },
        { status: 500 },
      );
    }
    return HttpResponse.json({
      ids: db.setFavorite(a.user!.id, String(params.nftId), false),
    });
  }),

  // carteiras
  http.get("*/api/wallets", async ({ request }) => {
    const a = await authenticate(request, true);
    if (a instanceof Response) return a;
    await delay(250);
    return HttpResponse.json(db.getWallets(a.user!.id));
  }),

  http.put("*/api/wallets/:kind", async ({ request, params }) => {
    const a = await authenticate(request, true);
    if (a instanceof Response) return a;
    const kind = String(params.kind);
    if (kind !== "primary" && kind !== "secondary") {
      return HttpResponse.json(
        { code: "NOT_FOUND", message: "Tipo de carteira inválido." },
        { status: 404 },
      );
    }
    const body = (await request.json()) as Parameters<typeof db.saveWallet>[2];
    await delay(400);
    try {
      return HttpResponse.json(db.saveWallet(a.user!.id, kind, body));
    } catch (e) {
      return fail(e);
    }
  }),

  http.delete("*/api/wallets/secondary", async ({ request }) => {
    const a = await authenticate(request, true);
    if (a instanceof Response) return a;
    return HttpResponse.json(db.removeSecondary(a.user!.id));
  }),

  // controle do ambiente de mocks (usado por demo e testes)
  http.post("*/api/_mock/expire-session", async ({ request }) => {
    await db.ready;
    const h = request.headers.get("Authorization");
    if (h?.startsWith("Bearer ")) db.expire(h.slice(7));
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("*/api/_mock/reset", async () => {
    resetCart();
    resetOrders();
    await db.resetAuth();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("*/api/_mock/reset", async () => {
    resetCart();
    resetOrders();
    resetCatalog();
    await db.resetAuth();
    return new HttpResponse(null, { status: 204 });
  }),
];
