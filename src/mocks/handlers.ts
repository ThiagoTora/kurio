import { http, HttpResponse, delay } from "msw";
import Decimal from "decimal.js";

import { buildNftDetail, collectionList } from "./db";
import { nfts } from "./store";
import { cartHandlers } from "./cartHandlers";

import type { NftListResponse, Network } from "@/types/nft";
import { orderHandlers } from "./orderHandlers";
import { accountHandlers } from "./accountHandlers";
import { controlHandlers } from "./controlHandlers";
import { socketHandlers } from "./socket";
import { getScenario } from "./scenario";

const PAGE_SIZE = 9;

export const handlers = [
  ...socketHandlers,
  ...controlHandlers,
  ...accountHandlers,
  ...cartHandlers,
  ...orderHandlers,

  // Listagem de NFTs
  http.get("*/api/nfts", async ({ request }) => {
    const url = new URL(request.url);
    const p = url.searchParams;

    const sc = getScenario();

    await delay(sc === "slow" ? 2500 : 300);

    if (sc === "nfts-error") {
      return HttpResponse.json({ code: "INTERNAL" }, { status: 500 });
    }

    if (sc === "nfts-empty") {
      return HttpResponse.json(emptyResponse());
    }

    let list = [...nfts];

    // Busca por nome
    const q = p.get("q")?.toLowerCase();

    if (q) {
      list = list.filter((n) => n.name.toLowerCase().includes(q));
    }

    // Filtro por coleção
    const collection = p.get("collection");

    if (collection) {
      list = list.filter((n) => n.collection === collection);
    }

    // Filtro por rede
    const network = p.get("network");

    if (network) {
      list = list.filter((n) => n.network === network);
    }

    // Filtro por preço mínimo
    const minPrice = p.get("minPrice");

    if (minPrice) {
      list = list.filter((n) => new Decimal(n.price).gte(minPrice));
    }

    // Filtro por preço máximo
    const maxPrice = p.get("maxPrice");

    if (maxPrice) {
      list = list.filter((n) => new Decimal(n.price).lte(maxPrice));
    }

    // Ordenação
    const sort = p.get("sort") ?? "recent";

    if (sort === "price_asc") {
      list.sort((a, b) => new Decimal(a.price).cmp(b.price));
    }

    if (sort === "price_desc") {
      list.sort((a, b) => new Decimal(b.price).cmp(a.price));
    }

    if (sort === "trending") {
      list = list.filter((n) => n.oldPrice);
      list.sort((a, b) => new Decimal(b.price).cmp(a.price));
    }

    // Aba de tendências
    if (p.get("tab") === "trending" && sort !== "trending") {
      list = list.filter((n) => n.oldPrice);
    }

    // Aba de novidades
    if (p.get("tab") === "new") {
      list.reverse();
    }

    // Paginação
    const page = Math.max(1, Math.floor(Number(p.get("page") ?? 1)) || 1);

    const body: NftListResponse = {
      items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      page,
      pageSize: PAGE_SIZE,
      total: list.length,
      facets: {
        collections: collectionList.map((c) => ({
          ...c,
          count: nfts.filter((n) => n.collection === c.slug).length,
        })),

        networks: (["ethereum", "polygon", "solana"] as Network[]).map(
          (slug) => ({
            slug,
            label: slug[0].toUpperCase() + slug.slice(1),
            count: nfts.filter((n) => n.network === slug).length,
          }),
        ),

        priceRange: {
          min: "0.02",
          max: "12.30",
        },
      },
    };

    return HttpResponse.json(body);
  }),

  // Detalhes de um NFT
  http.get("*/api/nfts/:id", async ({ params }) => {
    const sc = getScenario();

    await delay(sc === "slow" ? 2500 : 300);

    if (sc === "nfts-error") {
      return HttpResponse.json({ code: "INTERNAL" }, { status: 500 });
    }

    const nft = nfts.find((n) => n.id === params.id);

    if (!nft) {
      return HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    }

    return HttpResponse.json(buildNftDetail(nft));
  }),
];

function emptyResponse(): NftListResponse {
  return {
    items: [],
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    facets: {
      collections: [],
      networks: [],
      priceRange: {
        min: "0",
        max: "0",
      },
    },
  };
}
