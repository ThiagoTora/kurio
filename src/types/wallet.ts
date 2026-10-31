import type { Network } from "./nft";

export interface Wallet {
  kind: "primary" | "secondary";
  displayName: string;
  nickname: string;
  network: Network;
  profileName: string;
  address: string;
  secondaryRef?: string;
  walletType: "primary" | "secondary";
  referralCode: string;
  email: string;
  ensName: string;
  sameAsPrimary?: boolean;
}

export type WalletInput = Omit<Wallet, "kind" | "sameAsPrimary">;

export interface Wallets {
  primary: Wallet | null;
  secondary: Wallet | null;
}
