import type { User } from "@/types/auth";
import { queryClient } from "./queryClient";
import { SESSION_KEY, clearToken, setToken } from "./session";

// limpa tudo que é privado (carrinho, pedidos, favoritos, carteiras), mantém o catálogo público
const resetPrivate = () =>
  queryClient.resetQueries({
    predicate: (q) => !["nfts", "session"].includes(String(q.queryKey[0])),
  });

export function startSession(token: string, user: User) {
  setToken(token);
  queryClient.setQueryData(SESSION_KEY, user);
  resetPrivate();
}

// logout e troca de usuário: descarta o cache privado
export function endSession() {
  clearToken();
  queryClient.setQueryData(SESSION_KEY, null);
  resetPrivate();
}

// expiração: preserva a tela atual (ex.: formulário do checkout) até o novo login
export function expireSession() {
  clearToken();
  queryClient.setQueryData(SESSION_KEY, null);
}
