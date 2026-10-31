import { setScenario, type MockScenario } from "./scenario";

const post = (path: string, body?: unknown) =>
  fetch(`/api/_mock/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }).then((r) => r.status);

(window as unknown as { __kurio: unknown }).__kurio = {
  setPrice: (nftId: string, price: string) => post("nft", { nftId, price }),
  setStock: (nftId: string, editionId: string, available: number) =>
    post("nft", { nftId, editionId, available }),
  disconnect: (downMs = 0) => post("socket/disconnect", { downMs }),
  replay: (mode: "duplicate" | "stale") => post("socket/replay", { mode }),
  reset: () => post("reset"),
  expireSession: () =>
    fetch("/api/_mock/expire-session", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("kurio.session.token") ?? ""}`,
      },
    }).then((r) => r.status),
  scenario: (name: MockScenario) => setScenario(name),
};
