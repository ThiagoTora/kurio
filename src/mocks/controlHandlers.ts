import { http, HttpResponse } from "msw";
import Decimal from "decimal.js";
import { buildNftDetail, stockOverrides } from "./db";
import { nfts } from "./store";
import { disconnectAll, publishNftUpdated, replayLast } from "./socket";

export const controlHandlers = [
  // altera preço e/ou disponibilidade e emite nft.updated com a REST já refletindo a mudança
  http.post("*/api/_mock/nft", async ({ request }) => {
    const body = (await request.json()) as {
      nftId: string;
      price?: string;
      editionId?: string;
      available?: number;
    };
    const nft = nfts.find((n) => n.id === body.nftId);
    if (!nft) return HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 });

    if (body.price !== undefined) {
      const next = new Decimal(body.price);
      nft.oldPrice = next.lt(nft.price) ? nft.price : undefined;
      nft.price = next.toFixed(2);
    }
    if (body.available !== undefined) {
      if (body.editionId)
        (stockOverrides[nft.id] ??= {})[body.editionId] = body.available;
      else nft.available = body.available;
    }
    nft.version += 1;

    const editions = buildNftDetail(nft).editions.map((e) => ({
      id: e.id,
      available: e.available,
    }));
    return HttpResponse.json(publishNftUpdated(nft, editions));
  }),

  http.post("*/api/_mock/socket/disconnect", async ({ request }) => {
    const { downMs = 0 } = (await request.json().catch(() => ({}))) as {
      downMs?: number;
    };
    disconnectAll(downMs);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("*/api/_mock/socket/replay", async ({ request }) => {
    const { mode } = (await request.json()) as { mode: "duplicate" | "stale" };
    return new HttpResponse(null, { status: replayLast(mode) ? 204 : 404 });
  }),
];
