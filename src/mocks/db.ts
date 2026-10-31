import Decimal from "decimal.js";
import type { Nft, Network, NftDetail } from "@/types/nft";
import nft1 from "../assets/nfts/1.png";
import nft2 from "../assets/nfts/2.png";
import nft3 from "../assets/nfts/3.png";
import nft4 from "../assets/nfts/4.png";

const collections = [
  ["arte-digital", "Arte digital"],
  ["fotografia", "Fotografia"],
  ["musica", "Música"],
  ["arte-3d", "Arte 3D"],
  ["colecionaveis", "Colecionáveis"],
  ["generativa", "Generativa"],
  ["jogos", "Jogos"],
  ["assinaturas", "Assinaturas"],
  ["utilidade", "Utilidade"],
] as const;

const networks: Network[] = ["ethereum", "polygon", "solana"];

const IMAGE_POOL = [nft1, nft2, nft3, nft4] as const;

// Estoque personalizado por NFT e edição.
export const stockOverrides: Record<string, Record<string, number>> = {};

// PRNG determinístico (mulberry32)
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildNfts(count = 96): Nft[] {
  const r = rng(42);

  return Array.from({ length: count }, (_, i) => {
    const price = new Decimal(0.02 + r() * 12.28).toDecimalPlaces(2);
    const hasOld = r() > 0.8;

    return {
      id: `nft-${i + 1}`,
      name: `Kurio #${String(i + 1).padStart(3, "0")}`,
      image: IMAGE_POOL[Math.floor(r() * IMAGE_POOL.length)],
      collection: collections[i % collections.length][0],
      network: networks[Math.floor(r() * networks.length)],
      price: price.toFixed(2),
      oldPrice: hasOld ? price.mul(1.15).toFixed(2) : undefined,
      available: Math.floor(r() * 5),
      version: 1,
    };
  });
}

export const collectionList = collections.map(([slug, label]) => ({
  slug,
  label,
}));

export function buildNftDetail(nft: Nft): NftDetail {
  const n = Number(nft.id.split("-")[1]);

  const collectionName =
    collectionList.find((c) => c.slug === nft.collection)?.label ??
    nft.collection;

  const editions = [
    { id: "1-1", label: "1/1", available: n % 7 === 0 ? 0 : 1 },
    { id: "1-10", label: "1/10", available: Math.min(nft.available, 10) },
    { id: "1-50", label: "1/50", available: nft.available + 3 },
    { id: "open", label: "ABERTA", available: 99 },
  ].map((edition) => ({
    ...edition,
    available: stockOverrides[nft.id]?.[edition.id] ?? edition.available,
  }));

  return {
    ...nft,
    images: [nft.image, nft.image, nft.image, nft.image],
    summary:
      "Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.",
    description: [
      `${nft.name} é uma obra digital 1/50 finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na Ethereum. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      "A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.",
    ],
    rating: 4.8,
    reviewsCount: 19,
    reviews: [
      {
        id: "r1",
        author: "Marina S.",
        rating: 5,
        text: "Arte incrível e procedência fácil de verificar.",
      },
      {
        id: "r2",
        author: "Caio R.",
        rating: 5,
        text: "Entrega rápida do acesso desbloqueável.",
      },
      {
        id: "r3",
        author: "Lúcia M.",
        rating: 4,
        text: "Ótima coleção, gostaria de mais atributos.",
      },
    ],
    editions,
    tokenId: `#${String(n).padStart(4, "0")}`,
    collectionName,
    attributes: ["Óculos", "Esmeralda", "Raro"],
    royalty: "5%",
    contract: "0x7A42...19E8 • Contrato inteligente ERC-721 verificado.",
  };
}
