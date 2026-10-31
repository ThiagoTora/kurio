import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { useSession } from "@/api/auth";
import { clearNotices, setSocketConnected } from "@/lib/realtime";
import {
  applyNftUpdated,
  applyOrderUpdated,
  reconcile,
} from "@/lib/realtimeApply";
import { getToken } from "@/lib/session";
import type { Order } from "@/types/order";
import type { NftUpdate, RealtimeEvent } from "@/types/realtime";

export function RealtimeProvider() {
  const qc = useQueryClient();
  const { user, isLoading } = useSession();
  const userId = user?.id ?? null;

  // prova de que o provider foi montado
  useEffect(() => {
    document.documentElement.dataset.socket ??= "init";
  }, []);

  useEffect(() => {
    if (isLoading) return;
    clearNotices(); // avisos da sessão anterior

    const d = document.documentElement.dataset;
    d.socket = "connecting";
    delete d.socketError;
    delete d.socketAck;

    const socket = io({
      path: "/socket.io/",
      transports: ["websocket"], // o MSW simula apenas o transporte WebSocket
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      autoConnect: false,
    });

    let first = true;
    const seen = new Set<string>();
    const lastVersion = new Map<string, number>();

    // descarta duplicados (mesmo id) e eventos antigos (versão não maior que a já vista)
    const fresh = (evt: RealtimeEvent) => {
      if (seen.has(evt.id)) return false;
      seen.add(evt.id);
      if (seen.size > 500) seen.delete(seen.values().next().value as string);
      const key = `${evt.resource}:${evt.resourceId}`;
      if (evt.version <= (lastVersion.get(key) ?? 0)) return false;
      lastVersion.set(key, evt.version);
      return true;
    };

    socket.on("connect", () => {
      setSocketConnected(true);
      delete d.socketError;
      socket.emit("hello", { token: getToken() });
      if (!first) reconcile(qc); // reconexão: a REST é a fonte da verdade
      first = false;
    });

    // o servidor confirma a identidade da conexão (user ou guest)
    socket.on("hello.ack", (p: { authenticated: boolean }) => {
      d.socketAck = p.authenticated ? "user" : "guest";
    });

    socket.on("connect_error", (err) => {
      d.socketError = err.message;
      console.warn("[socket] connect_error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      setSocketConnected(false);
      delete d.socketAck;
      console.debug("[socket] disconnect:", reason);
    });

    socket.on("nft.updated", (evt: RealtimeEvent<NftUpdate>) => {
      if (fresh(evt)) applyNftUpdated(qc, evt);
    });
    socket.on("order.updated", (evt: RealtimeEvent<Order>) => {
      if (evt.userId !== userId) return; // evento de outra sessão/usuário
      if (fresh(evt)) applyOrderUpdated(qc, evt);
    });

    socket.connect();

    // libera listeners e conexão ao encerrar a sessão ou desmontar
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      setSocketConnected(false);
    };
  }, [qc, userId, isLoading]);

  return null;
}
