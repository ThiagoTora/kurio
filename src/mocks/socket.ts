import { ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import type { Nft } from "@/types/nft";
import type { Order } from "@/types/order";
import type { NftUpdate, RealtimeEvent } from "@/types/realtime";
import * as auth from "./authDb";

// Casa qualquer WebSocket e filtra pelo caminho dentro do handler,
// sem depender de como o MSW compara a URL do handshake
export const socketLink = ws.link("*");

type Io = ReturnType<typeof toSocketIo>;
interface Conn {
  io: Io;
  userId: string | null;
  close: () => void;
}

const conns = new Set<Conn>();
const history: RealtimeEvent[] = [];
let downUntil = 0;
let seq = 0;

const eventId = () => `evt-${Date.now().toString(36)}-${seq++}`;

function dispatch(evt: RealtimeEvent) {
  const name = evt.resource === "nft" ? "nft.updated" : "order.updated";
  for (const c of conns) {
    // eventos de pedido só chegam ao dono, autenticado na conexão
    if (evt.resource === "order" && c.userId !== evt.userId) continue;
    c.io.client.emit(name, evt);
  }
}

function publish(evt: RealtimeEvent) {
  history.push(evt);
  if (history.length > 50) history.shift();
  dispatch(evt);
  return evt;
}

export function publishNftUpdated(nft: Nft, editions: NftUpdate["editions"]) {
  const data: NftUpdate = {
    price: nft.price,
    oldPrice: nft.oldPrice,
    available: nft.available,
    editions,
  };
  return publish({
    id: eventId(),
    resource: "nft",
    resourceId: nft.id,
    version: nft.version,
    sentAt: new Date().toISOString(),
    data,
  });
}

export function publishOrderUpdated(userId: string, order: Order) {
  return publish({
    id: eventId(),
    resource: "order",
    resourceId: order.id,
    version: order.version,
    userId,
    sentAt: new Date().toISOString(),
    data: order,
  });
}

// interrupção de conexão: derruba os sockets e recusa reconexões por `downMs`
export function disconnectAll(downMs = 0) {
  downUntil = Date.now() + downMs;
  for (const c of [...conns]) c.close();
  conns.clear();
}

// reenvia o último evento: duplicado (mesmo id) ou antigo (id novo, versão anterior, dados defasados)
export function replayLast(mode: "duplicate" | "stale"): boolean {
  const last = history[history.length - 1];
  if (!last) return false;
  if (mode === "duplicate") {
    dispatch(last);
    return true;
  }
  dispatch({
    ...last,
    id: eventId(),
    version: Math.max(0, last.version - 1),
    data:
      last.resource === "nft"
        ? { ...(last.data as NftUpdate), price: "0.01" }
        : { ...(last.data as Order), status: "pending" },
  });
  return true;
}

export const socketHandlers = [
  socketLink.addEventListener("connection", (connection) => {
    const { pathname } = new URL(String(connection.client.url));

    // outros WebSockets (ex.: HMR do Vite no dev) seguem para o servidor real
    if (!pathname.startsWith("/socket.io")) {
      connection.server.connect();
      return;
    }

    if (Date.now() < downUntil) {
      connection.client.close();
      return;
    }

    const io = toSocketIo(connection);
    const conn: Conn = {
      io,
      userId: null,
      close: () => connection.client.close(),
    };
    conns.add(conn);
    connection.client.addEventListener("close", () => conns.delete(conn));

    // autenticação da conexão: o token identifica o usuário desta sessão
    io.client.on("hello", async (payload?: { token?: string | null }) => {
      await auth.ready;
      const r = payload?.token ? auth.resolve(payload.token) : null;
      conn.userId = r?.state === "ok" ? r.user.id : null;
      io.client.emit("hello.ack", { authenticated: conn.userId !== null });
    });
  }),
];
