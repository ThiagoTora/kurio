import { buildNfts, stockOverrides } from "./db";

export const nfts = buildNfts();

// reset: devolve o catálogo ao cenário conhecido
export function resetCatalog() {
  nfts.splice(0, nfts.length, ...buildNfts());
  for (const k of Object.keys(stockOverrides)) delete stockOverrides[k];
}
