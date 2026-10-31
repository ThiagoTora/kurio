// src/types/realtime.ts
export interface RealtimeEvent<T = unknown> {
  id: string; // identidade estável (dedupe)
  resource: "nft" | "order"; // recurso afetado
  resourceId: string;
  version: number; // ordenação: evento antigo nunca regride o estado
  userId?: string; // eventos privados (pedidos)
  sentAt: string;
  data: T;
}

export interface NftUpdate {
  price: string;
  oldPrice?: string;
  available: number;
  editions: { id: string; available: number }[];
}
