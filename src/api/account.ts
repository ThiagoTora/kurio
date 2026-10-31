import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { http } from "./http";
import type { Wallet, WalletInput, Wallets } from "@/types/wallet";

// favoritos
export const favoritesKey = ["favorites"] as const;

export const favoritesQuery = () =>
  queryOptions({
    queryKey: favoritesKey,
    queryFn: async ({ signal }) =>
      (await http.get<{ ids: string[] }>("/favorites", { signal })).data.ids,
  });

// atualização otimista com rollback
export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["favorites", "toggle"],
    mutationFn: async ({
      nftId,
      favorite,
    }: {
      nftId: string;
      favorite: boolean;
    }) =>
      favorite
        ? http.put(`/favorites/${nftId}`)
        : http.delete(`/favorites/${nftId}`),
    onMutate: async ({ nftId, favorite }) => {
      await qc.cancelQueries({ queryKey: favoritesKey });
      const previous = qc.getQueryData<string[]>(favoritesKey) ?? [];
      qc.setQueryData<string[]>(
        favoritesKey,
        favorite
          ? [...new Set([...previous, nftId])]
          : previous.filter((id) => id !== nftId),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(favoritesKey, ctx.previous);
    },
    onSettled: () => {
      if (qc.isMutating({ mutationKey: ["favorites"] }) <= 1)
        qc.invalidateQueries({ queryKey: favoritesKey });
    },
  });
}

// carteiras
export const walletsKey = ["wallets"] as const;

export const walletsQuery = () =>
  queryOptions({
    queryKey: walletsKey,
    queryFn: async ({ signal }) =>
      (await http.get<Wallets>("/wallets", { signal })).data,
  });

export function useSaveWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      kind,
      wallet,
    }: {
      kind: Wallet["kind"];
      wallet: WalletInput | { sameAsPrimary: true };
    }) => (await http.put<Wallets>(`/wallets/${kind}`, wallet)).data,
    onSuccess: (w) => qc.setQueryData(walletsKey, w),
  });
}

export function useRemoveSecondary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await http.delete<Wallets>("/wallets/secondary")).data,
    onSuccess: (w) => qc.setQueryData(walletsKey, w),
  });
}
