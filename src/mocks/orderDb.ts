import type { Nft } from "@/types/nft";
import type { CreateOrderBody, Order } from "@/types/order";
import { CartError, consumeItems, getCart } from "./cartDb";
import { fakeHex } from "./utils";
import { publishOrderUpdated } from "./socket";
import { setCartOwner } from "./cartDb";
import { nfts } from "./store";
import { getScenario } from "./scenario";

const KEY = "kurio.mock.orders.v1";
const SETTLE_MS = 1500;

interface Stored {
  userId: string;
  order: Order;
  idemKey: string;
  fingerprint: string;
  createdMs: number;
  settleMs: number;
  outcome: "confirmed" | "declined";
  applied: boolean;
  consume: { nftId: string; editionId: string; quantity: number }[];
}

interface State {
  orders: Stored[];
  nextId: number;
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* ignore */
  }

  return { orders: [], nextId: 1 };
}

let state = load();

const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
};

export function resetOrders() {
  state = { orders: [], nextId: 1 };

  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

function settle(nfts: Nft[], s: Stored): Order {
  if (
    s.order.status === "pending" &&
    Date.now() - s.createdMs >= (s.settleMs ?? SETTLE_MS)
  ) {
    s.order =
      s.outcome === "confirmed"
        ? {
            ...s.order,
            status: "confirmed",
            txHash: `0x${fakeHex(s.order.id, 64)}`,
            version: s.order.version + 1,
          }
        : {
            ...s.order,
            status: "declined",
            declineReason: "Pagamento recusado pela carteira (simulação).",
            version: s.order.version + 1,
          };

    if (s.outcome === "confirmed" && !s.applied) {
      consumeItems(nfts, s.consume);
      s.applied = true;
    }

    persist();
  }

  return s.order;
}

function arm(s: Stored) {
  const wait =
    Math.max(0, s.createdMs + (s.settleMs ?? SETTLE_MS) - Date.now()) + 50;

  setTimeout(() => {
    setCartOwner(`user:${s.userId}`);

    const before = s.order.status;
    const updated = settle(nfts, s);

    if (updated.status !== before) {
      publishOrderUpdated(s.userId, updated);
    }
  }, wait);
}

export function createOrder(
  nfts: Nft[],
  userId: string,
  idemKey: string,
  body: CreateOrderBody,
) {
  const fingerprint = JSON.stringify(body);

  const existing = state.orders.find(
    (o) => o.userId === userId && o.idemKey === idemKey,
  );

  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      throw new CartError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "Esta chave de idempotência já foi usada com outro conteúdo.",
      );
    }

    return { order: settle(nfts, existing), created: false };
  }

  // validação vinda da API
  const c = body.collector;
  const fields: Record<string, string> = {};

  if (!/^\S+@\S+\.\S+$/.test(c.email)) {
    fields.email = "E-mail inválido.";
  }

  if (c.referralCode.toUpperCase() === "INVALID") {
    fields.referralCode = "Código de indicação inexistente.";
  }

  if (Object.keys(fields).length) {
    throw new CartError(
      422,
      "VALIDATION",
      "Corrija os campos destacados.",
      fields,
    );
  }

  // revalidação de carrinho, disponibilidade, cupom e taxas
  const cart = getCart(nfts);

  if (cart.items.length === 0) {
    throw new CartError(422, "EMPTY_CART", "Seu carrinho está vazio.");
  }

  const over = cart.items.find((i) => i.quantity > i.available);

  if (over) {
    throw new CartError(
      409,
      "AVAILABILITY_CONFLICT",
      `${over.name} não tem mais a quantidade escolhida.`,
    );
  }

  if (cart.quote.total !== body.expectedTotal) {
    throw new CartError(409, "QUOTE_CHANGED", "Os valores do pedido mudaram.");
  }

  const id = `ord-${state.nextId++}`;

  const order: Order = {
    id,
    status: "pending",
    items: cart.items.map((i) => ({
      nftId: i.nftId,
      name: i.name,
      image: i.image,
      tokenId: i.tokenId,
      editionLabel: i.editionLabel,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    })),
    quote: cart.quote,
    collector: {
      displayName: c.displayName,
      email: c.email,
      walletAddress: c.walletAddress,
    },
    provider: body.provider,
    network: body.network,
    txHash: null,
    declineReason: null,
    createdAt: new Date().toISOString(),
    version: 1,
  };

  state.orders.push({
    userId,
    order,
    idemKey,
    fingerprint,
    createdMs: Date.now(),
    settleMs: getScenario() === "slow-payment" ? 5000 : SETTLE_MS,
    outcome: getScenario() === "declined" ? "declined" : "confirmed",
    applied: false,
    consume: cart.items.map((i) => ({
      nftId: i.nftId,
      editionId: i.editionId,
      quantity: i.quantity,
    })),
  });

  persist();

  const stored = state.orders[state.orders.length - 1];

  arm(stored);

  return { order, created: true };
}

export function getOrder(nfts: Nft[], userId: string, id: string): Order {
  const s = state.orders.find((o) => o.order.id === id && o.userId === userId);

  if (!s) {
    throw new CartError(404, "NOT_FOUND", "Pedido não encontrado.");
  }

  return settle(nfts, s);
}

// Pedidos pendentes sobrevivem ao reload: reagenda a confirmação.
for (const s of state.orders) {
  if (s.order.status === "pending") {
    arm(s);
  }
}
