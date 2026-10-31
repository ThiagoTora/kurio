export interface CartItem {
  id: string;
  nftId: string;
  name: string;
  image: string;
  tokenId: string;
  editionId: string;
  editionLabel: string;
  unitPrice: string; // ETH, string decimal
  quantity: number;
  available: number;
  lineTotal: string; // ETH, string decimal
}

export interface CartQuote {
  subtotal: string;
  discount: string;
  networkFee: string;
  total: string;
  couponCode: string | null;
}

export interface Cart {
  items: CartItem[];
  quote: CartQuote;
  version: number;
}
