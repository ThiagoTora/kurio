// Cenários: ?mock=<nome> no carregamento (?mock=reset limpa) ou __kurio.scenario("<nome>") em runtime
export type MockScenario =
  | "default"
  | "declined" // pagamento recusado
  | "timeout" // pedido criado, resposta além do timeout do cliente
  | "wallet-rejected" // carteira recusa a conexão
  | "favorite-fail" // mutation de favorito falha
  | "slow" // catálogo lento (2,5 s)
  | "slow-payment" // pedido leva 5 s para confirmar
  | "nfts-error" // 500 no catálogo e no detalhe
  | "nfts-empty"; // catálogo vazio

const KEY = "kurio.mock.scenario";
const VALID: MockScenario[] = [
  "declined",
  "timeout",
  "wallet-rejected",
  "favorite-fail",
  "slow",
  "slow-payment",
  "nfts-error",
  "nfts-empty",
];

(function capture() {
  try {
    const v = new URLSearchParams(window.location.search).get("mock");
    if (v === "reset" || v === "default") sessionStorage.removeItem(KEY);
    else if (v && (VALID as string[]).includes(v))
      sessionStorage.setItem(KEY, v);
  } catch {
    /* ignore */
  }
})();

export function getScenario(): MockScenario {
  try {
    return (sessionStorage.getItem(KEY) as MockScenario) ?? "default";
  } catch {
    return "default";
  }
}

export function setScenario(v: MockScenario) {
  try {
    if (v === "default") sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, v);
  } catch {
    /* ignore */
  }
}
