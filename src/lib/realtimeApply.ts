import type { QueryClient } from "@tanstack/react-query";
import { cartKey } from "@/api/cart";
import { orderKey } from "@/api/order";
import type { Cart } from "@/types/cart";
import type { NftDetail, NftListResponse } from "@/types/nft";
import type { Order } from "@/types/order";
import type { NftUpdate, RealtimeEvent } from "@/types/realtime";
import { pushNotice } from "./realtime";

export function applyNftUpdated(
  qc: QueryClient,
  evt: RealtimeEvent<NftUpdate>,
) {
  const d = evt.data;

  // catálogo (todas as listagens em cache)
  qc.setQueriesData<NftListResponse>(
    { queryKey: ["nfts", "list"] },
    (old) =>
      old && {
        ...old,
        items: old.items.map((n) =>
          n.id === evt.resourceId && n.version < evt.version
            ? {
                ...n,
                price: d.price,
                oldPrice: d.oldPrice,
                available: d.available,
                version: evt.version,
              }
            : n,
        ),
      },
  );

  // detalhe
  qc.setQueryData<NftDetail>(["nfts", "detail", evt.resourceId], (old) =>
    old && old.version < evt.version
      ? {
          ...old,
          price: d.price,
          oldPrice: d.oldPrice,
          available: d.available,
          editions: d.editions.map((edition) => ({
            ...edition,
            label:
              old.editions.find((previous) => previous.id === edition.id)
                ?.label ?? edition.id,
          })),
          version: evt.version,
        }
      : old,
  );

  // carrinho: avisa e reconcilia com a cotação da API (fonte da verdade)
  const cart = qc.getQueryData<Cart>(cartKey);
  const affected = cart?.items.filter((i) => i.nftId === evt.resourceId) ?? [];
  if (affected.length === 0) return;

  for (const i of affected) {
    if (i.unitPrice !== d.price) {
      pushNotice(
        `${i.name}: o preço mudou de ${i.unitPrice} ETH para ${d.price} ETH.`,
      );
    }
    const ed = d.editions.find((e) => e.id === i.editionId);
    if (ed && ed.available < i.quantity) {
      pushNotice(
        `${i.name}: a disponibilidade desta edição caiu para ${ed.available}.`,
      );
    }
  }
  qc.invalidateQueries({ queryKey: cartKey });
}

export function applyOrderUpdated(qc: QueryClient, evt: RealtimeEvent<Order>) {
  qc.setQueryData<Order>(orderKey(evt.resourceId), (old) => {
    if (old && old.status !== "pending") return old; // estados terminais não mudam
    if (old && old.version >= evt.version) return old; // evento antigo ou duplicado
    return evt.data;
  });
  if (evt.data.status !== "pending")
    qc.invalidateQueries({ queryKey: cartKey });
}

// após reconexão: a REST é a fonte da verdade para os recursos ativos
export function reconcile(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["nfts"], refetchType: "active" });
  qc.invalidateQueries({ queryKey: cartKey, refetchType: "active" });
  qc.invalidateQueries({ queryKey: ["orders"], refetchType: "active" });
}
