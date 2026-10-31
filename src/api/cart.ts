import Decimal from "decimal.js";
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { http } from "./nfts";
import type { Cart } from "@/types/cart";

export const cartKey = ["cart"] as const;

export const cartQuery = () =>
  queryOptions({
    queryKey: cartKey,
    queryFn: async ({ signal }) => {
      const { data } = await http.get<Cart>("/cart", { signal });
      if (!data || !Array.isArray(data.items))
        throw new Error("Resposta inválida de /api/cart");
      return data;
    },
  });

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["cart", "add"],
    mutationFn: async (v: {
      nftId: string;
      editionId: string;
      quantity: number;
    }) => (await http.post<Cart>("/cart/items", v)).data,
    onSuccess: (cart) => qc.setQueryData(cartKey, cart),
  });
}

// Atualização otimista com rollback
export function useUpdateQuantity() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["cart", "quantity"],
    mutationFn: async ({
      itemId,
      quantity,
    }: {
      itemId: string;
      quantity: number;
    }) => (await http.patch<Cart>(`/cart/items/${itemId}`, { quantity })).data,
    onMutate: async ({ itemId, quantity }) => {
      await qc.cancelQueries({ queryKey: cartKey });
      const previous = qc.getQueryData<Cart>(cartKey);
      if (previous) {
        qc.setQueryData<Cart>(cartKey, {
          ...previous,
          items: previous.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  quantity,
                  lineTotal: new Decimal(i.unitPrice).mul(quantity).toFixed(2),
                }
              : i,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(cartKey, ctx.previous);
    },
    onSettled: () => {
      // só reconcilia quando for a última mutation em voo (evita sobrescrever cliques rápidos)
      if (qc.isMutating({ mutationKey: ["cart"] }) <= 1)
        qc.invalidateQueries({ queryKey: cartKey });
    },
  });
}

export function useRemoveItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["cart", "remove"],
    mutationFn: async (itemId: string) =>
      (await http.delete<Cart>(`/cart/items/${itemId}`)).data,
    onSuccess: (cart) => qc.setQueryData(cartKey, cart),
  });
}

export function useApplyCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["cart", "coupon"],
    mutationFn: async (code: string) =>
      (await http.put<Cart>("/cart/coupon", { code })).data,
    onSuccess: (cart) => qc.setQueryData(cartKey, cart),
  });
}

export function useRemoveCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["cart", "coupon-remove"],
    mutationFn: async () => (await http.delete<Cart>("/cart/coupon")).data,
    onSuccess: (cart) => qc.setQueryData(cartKey, cart),
  });
}
