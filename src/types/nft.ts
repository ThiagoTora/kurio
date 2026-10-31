export type Network = "ethereum" | "polygon" | "solana";
export type SortKey = "recent" | "price_asc" | "price_desc" | "trending";
export type Tab = "all" | "new" | "trending";

export interface Nft {
  id: string;
  name: string;
  image: string;
  collection: string;
  network: Network;
  price: string; // ETH, string decimal
  oldPrice?: string;
  available: number;
  version: number;
}

export interface NftListParams {
  tab: Tab;
  q?: string;
  collection?: string;
  network?: Network;
  minPrice?: string;
  maxPrice?: string;
  sort: SortKey;
  page: number;
}

export interface NftListResponse {
  items: Nft[];
  page: number;
  pageSize: number;
  total: number;
  facets: {
    collections: { slug: string; label: string; count: number }[];
    networks: { slug: Network; label: string; count: number }[];
    priceRange: { min: string; max: string };
  };
}

export interface NftEdition {
  id: string;
  label: string;
  available: number;
}

export interface NftReview {
  id: string;
  author: string;
  rating: number;
  text: string;
}

export interface NftDetail extends Nft {
  images: string[];
  summary: string;
  description: string[];
  rating: number;
  reviewsCount: number;
  reviews: NftReview[];
  editions: NftEdition[];
  tokenId: string;
  collectionName: string;
  attributes: string[];
  royalty: string;
  contract: string;
}
