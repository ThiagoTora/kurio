// src/types/order.ts
import type { CartQuote } from "./cart";
import type { Network } from "./nft";

export type WalletProvider = "walletconnect" | "metamask" | "coinbase";
export type OrderStatus = "pending" | "confirmed" | "declined";

export interface Collector {
  displayName: string;
  username: string;
  profileName: string;
  email: string;
  walletAddress: string;
  secondaryWallet?: string;
  walletType: "primary" | "secondary";
  referralCode: string;
  ensName: string;
  note?: string;
}

export interface CreateOrderBody {
  collector: Collector;
  provider: WalletProvider;
  network: Network;
  expectedTotal: string; // total que o usuário viu; o servidor revalida
}

export interface OrderItemSnapshot {
  nftId: string;
  name: string;
  image: string;
  tokenId: string;
  editionLabel: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  items: OrderItemSnapshot[];
  quote: CartQuote;
  collector: Pick<Collector, "displayName" | "email" | "walletAddress">;
  provider: WalletProvider;
  network: Network;
  txHash: string | null;
  declineReason: string | null;
  createdAt: string;
  version: number;
}

export interface WalletConnection {
  address: string;
  provider: WalletProvider;
  network: Network;
}
