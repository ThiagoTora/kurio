import Decimal from "decimal.js";
import type { Cart, CartItem, CartQuote } from "@/types/cart";
import type { Nft } from "@/types/nft";
import { buildNftDetail } from "./db";

const KEY = "kurio.mock.carts.v1";

interface StoredItem {
  id: string;
  nftId: string;
  editionId: string;
  quantity: number;
}

interface State {
  items: StoredItem[];
  couponCode: string | null;
  version: number;
  nextId: number;
}

const empty = (): State => ({
  items: [],
  couponCode: null,
  version: 1,
  nextId: 1,
});

function loadAll(): Record<string, State> {
  try {
    const raw = localStorage.getItem(KEY);

    if (raw) {
      const parsed: unknown = JSON.parse(raw);

      if (
        parsed &&
        typeof parsed === "object" &&
        "items" in parsed &&
        Array.isArray(parsed.items)
      ) {
        // Migração do formato antigo: um único carrinho para o visitante.
        return { "guest:default": parsed as State };
      }

      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, State>;
      }
    }
  } catch {
    /* ignore */
  }

  return {};
}

let all = loadAll();
let owner = "guest:default";

export function setCartOwner(o: string) {
  owner = o;
}

const current = () => (all[owner] ??= empty());

const state = new Proxy({} as State, {
  get: (_t, k) => current()[k as keyof State],
  set: (_t, k, v) => {
    (current() as unknown as Record<string, unknown>)[k as string] = v;
    return true;
  },
});

function commit() {
  state.version += 1;

  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function resetCart() {
  all = {};

  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export class CartError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);

    this.name = "CartError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
// Transfere os itens do visitante para o carrinho do usuário autenticado.
export function mergeGuestCart(
  nfts: Nft[],
  guestOwner: string,
  userOwner: string,
) {
  const guest = all[guestOwner];

  if (!guest || guest.items.length === 0) return;

  setCartOwner(userOwner);

  for (const g of guest.items) {
    let available: number;

    try {
      available = availableOf(nfts, g.nftId, g.editionId);
    } catch {
      continue;
    }

    const existing = state.items.find(
      (i) => i.nftId === g.nftId && i.editionId === g.editionId,
    );

    const qty = Math.min((existing?.quantity ?? 0) + g.quantity, available);

    if (qty < 1) continue;

    if (existing) {
      existing.quantity = qty;
    } else {
      state.items.push({
        id: `ci-${state.nextId++}`,
        nftId: g.nftId,
        editionId: g.editionId,
        quantity: qty,
      });
    }
  }

  if (!state.couponCode && guest.couponCode) {
    state.couponCode = guest.couponCode;
  }

  delete all[guestOwner];
  commit();
}

export function consumeItems(
  _nfts: Nft[],
  purchased: {
    nftId: string;
    editionId: string;
    quantity: number;
  }[],
) {
  for (const p of purchased) {
    const item = state.items.find(
      (i) => i.nftId === p.nftId && i.editionId === p.editionId,
    );

    if (item) item.quantity -= p.quantity;
  }

  state.items = state.items.filter((i) => i.quantity > 0);
  commit();
}

const COUPONS: Record<string, string> = {
  KURIO10: "10",
  GENESIS5: "5",
};

const EXPIRED = new Set(["VERAO24"]);

function quote(items: CartItem[]): CartQuote {
  const subtotal = items.reduce(
    (acc, i) => acc.plus(i.lineTotal),
    new Decimal(0),
  );

  const percent = state.couponCode ? COUPONS[state.couponCode] : undefined;

  const discount = percent
    ? subtotal.mul(percent).div(100).toDecimalPlaces(2)
    : new Decimal(0);

  const base = subtotal.minus(discount);
  const fee = base.mul("0.0006").toDecimalPlaces(3, Decimal.ROUND_HALF_UP);

  return {
    subtotal: subtotal.toFixed(2),
    discount: discount.toFixed(2),
    networkFee: fee.toFixed(3),
    total: base.plus(fee).toFixed(3),
    couponCode: state.couponCode,
  };
}

export function getCart(nfts: Nft[]): Cart {
  const items: CartItem[] = [];

  for (const s of state.items) {
    const nft = nfts.find((n) => n.id === s.nftId);

    if (!nft) continue;

    const detail = buildNftDetail(nft);
    const edition = detail.editions.find((e) => e.id === s.editionId);

    items.push({
      id: s.id,
      nftId: nft.id,
      name: nft.name,
      image: nft.image,
      tokenId: detail.tokenId,
      editionId: s.editionId,
      editionLabel: edition?.label ?? "",
      unitPrice: nft.price,
      quantity: s.quantity,
      available: edition?.available ?? 0,
      lineTotal: new Decimal(nft.price).mul(s.quantity).toFixed(2),
    });
  }

  return {
    items,
    quote: quote(items),
    version: state.version,
  };
}

function availableOf(nfts: Nft[], nftId: string, editionId: string): number {
  const nft = nfts.find((n) => n.id === nftId);

  if (!nft) {
    throw new CartError(404, "NOT_FOUND", "NFT não encontrado.");
  }

  const edition = buildNftDetail(nft).editions.find((e) => e.id === editionId);

  if (!edition) {
    throw new CartError(404, "NOT_FOUND", "Edição não encontrada.");
  }

  return edition.available;
}

const isQty = (n: unknown): n is number =>
  Number.isInteger(n) && (n as number) >= 1;

export function addItem(
  nfts: Nft[],
  v: {
    nftId: string;
    editionId: string;
    quantity: number;
  },
): Cart {
  if (!isQty(v.quantity)) {
    throw new CartError(422, "VALIDATION", "Quantidade inválida.");
  }

  const available = availableOf(nfts, v.nftId, v.editionId);

  if (available === 0) {
    throw new CartError(409, "SOLD_OUT", "Edição esgotada.");
  }

  const existing = state.items.find(
    (i) => i.nftId === v.nftId && i.editionId === v.editionId,
  );

  const next = (existing?.quantity ?? 0) + v.quantity;

  if (next > available) {
    throw new CartError(
      409,
      "AVAILABILITY_CONFLICT",
      `Quantidade acima da disponibilidade desta edição (máx. ${available}).`,
    );
  }

  if (existing) {
    existing.quantity = next;
  } else {
    state.items.push({
      id: `ci-${state.nextId++}`,
      nftId: v.nftId,
      editionId: v.editionId,
      quantity: v.quantity,
    });
  }

  commit();
  return getCart(nfts);
}

export function setQuantity(
  nfts: Nft[],
  itemId: string,
  quantity: number,
): Cart {
  const item = state.items.find((i) => i.id === itemId);

  if (!item) {
    throw new CartError(404, "NOT_FOUND", "Item não encontrado no carrinho.");
  }

  if (!isQty(quantity)) {
    throw new CartError(422, "VALIDATION", "Quantidade inválida.");
  }

  const available = availableOf(nfts, item.nftId, item.editionId);

  if (quantity > available) {
    throw new CartError(
      409,
      "AVAILABILITY_CONFLICT",
      `Quantidade acima da disponibilidade desta edição (máx. ${available}).`,
    );
  }

  item.quantity = quantity;
  commit();

  return getCart(nfts);
}

export function removeItem(nfts: Nft[], itemId: string): Cart {
  if (!state.items.some((i) => i.id === itemId)) {
    throw new CartError(404, "NOT_FOUND", "Item não encontrado no carrinho.");
  }

  state.items = state.items.filter((i) => i.id !== itemId);
  commit();

  return getCart(nfts);
}

export function applyCoupon(nfts: Nft[], raw: string): Cart {
  const code = String(raw ?? "")
    .trim()
    .toUpperCase();

  if (!code) {
    throw new CartError(422, "VALIDATION", "Informe um código promocional.");
  }

  if (EXPIRED.has(code)) {
    throw new CartError(410, "COUPON_EXPIRED", "Este cupom expirou.");
  }

  if (!COUPONS[code]) {
    throw new CartError(422, "COUPON_INVALID", "Cupom inválido.");
  }

  state.couponCode = code;
  commit();

  return getCart(nfts);
}

export function removeCoupon(nfts: Nft[]): Cart {
  state.couponCode = null;
  commit();

  return getCart(nfts);
}
