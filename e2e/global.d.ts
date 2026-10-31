declare global {
  interface Window {
    __kurio: {
      setPrice(nftId: string, price: string): Promise<number>;
      setStock(
        nftId: string,
        editionId: string,
        available: number,
      ): Promise<number>;
      disconnect(downMs?: number): Promise<number>;
      replay(mode: "duplicate" | "stale"): Promise<number>;
      expireSession(): Promise<number>;
      reset(): Promise<number>;
      scenario(name: string): void;
    };
  }
}
export {};
