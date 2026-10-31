import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { http } from "./nfts";
import { cartKey } from "./cart";
import type {
  CreateOrderBody,
  Order,
  WalletConnection,
  WalletProvider,
} from "@/types/order";
import type { Network } from "@/types/nft";

export const orderKey = (id: string) => ["orders", id] as const;

export const orderQuery = (id: string) =>
  queryOptions({
    queryKey: orderKey(id),
    queryFn: async ({ signal }) =>
      (await http.get<Order>(`/orders/${id}`, { signal })).data,
    refetchOnReconnect: true,
    retry: (count, err: any) => err?.response?.status !== 404 && count < 3,
  });

export function useConnectWallet() {
  return useMutation({
    mutationKey: ["wallet", "connect"],
    mutationFn: async (v: { provider: WalletProvider; network: Network }) =>
      (await http.post<WalletConnection>("/wallet/connect", v)).data,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["orders", "create"],
    mutationFn: async ({ body, key }: { body: CreateOrderBody; key: string }) =>
      (
        await http.post<Order>("/orders", body, {
          headers: { "Idempotency-Key": key },
        })
      ).data,
    onSuccess: (order) => {
      qc.setQueryData(orderKey(order.id), order);
      qc.invalidateQueries({ queryKey: cartKey });
    },
  });
}
