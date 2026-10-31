export function fakeHex(seed: string, length: number) {
  let h = 2166136261;
  let out = "";
  while (out.length < length) {
    for (const ch of seed + out.length) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    out += (h >>> 0).toString(16).padStart(8, "0");
  }
  return out.slice(0, length);
}
