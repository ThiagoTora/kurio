import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { NftDetail, NftListParams, NftListResponse } from "@/types/nft";
import { http } from "./http";
export { http };

export const nftsQuery = (params: NftListParams) =>
  queryOptions({
    queryKey: ["nfts", "list", params],
    queryFn: async ({ signal }) => {
      const { data } = await http.get<NftListResponse>("/nfts", {
        params,
        signal,
      });
      if (!data || !Array.isArray(data.items)) {
        throw new Error(
          "Resposta inválida de /api/nfts (MSW provavelmente não está ativo)",
        );
      }
      return data;
    },
    placeholderData: keepPreviousData,
  });

export const nftDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["nfts", "detail", id],
    queryFn: async ({ signal }) => {
      const { data } = await http.get<NftDetail>(`/nfts/${id}`, { signal });
      if (!data || typeof data !== "object" || !("id" in data)) {
        throw new Error("Resposta inválida de /api/nfts/:id");
      }
      return data;
    },
    retry: (count, err) =>
      !(isAxiosError(err) && err.response?.status === 404) && count < 2,
  });
