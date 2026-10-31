const K = "kurio.checkout.idem";

export function keyFor(payload: unknown): string {
  const hash = JSON.stringify(payload);
  try {
    const raw = sessionStorage.getItem(K);
    if (raw) {
      const p = JSON.parse(raw) as { hash: string; key: string };
      if (p.hash === hash) return p.key;
    }
  } catch {
    /* ignore */
  }
  const key = crypto.randomUUID();
  try {
    sessionStorage.setItem(K, JSON.stringify({ hash, key }));
  } catch {
    /* ignore */
  }
  return key;
}

export function clearKey() {
  try {
    sessionStorage.removeItem(K);
  } catch {
    /* ignore */
  }
}
