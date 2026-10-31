import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { nftsQuery } from "@/api/nfts";
import { NftCard, NftCardSkeleton } from "@/components/NftCard";
import type { NftListParams } from "@/types/nft";

const PER_PAGE = 5;

interface Props {
  title: string;
  params: NftListParams;
  excludeIds?: string[];
}

export function NftCarousel({ title, params, excludeIds = [] }: Props) {
  const titleId = useId();
  const { data, isPending, isError, refetch } = useQuery(nftsQuery(params));
  const [page, setPage] = useState(0);

  const items = (data?.items ?? []).filter((n) => !excludeIds.includes(n.id));

  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));

  // Garante que a página exibida esteja dentro dos limites.
  const currentPage = page >= pages ? 0 : page;

  const visible = items.slice(
    currentPage * PER_PAGE,
    (currentPage + 1) * PER_PAGE,
  );

  return (
    <section aria-labelledby={titleId} className="mt-12">
      <h2
        id={titleId}
        className="border-b border-border pb-2 text-xs font-bold text-accent"
      >
        {title}
      </h2>

      {isError ? (
        <p role="alert" className="py-8 text-center text-xs">
          Não foi possível carregar as sugestões.
          <button
            onClick={() => refetch()}
            className="ml-2 text-accent underline"
          >
            Tentar novamente
          </button>
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {isPending
            ? Array.from({ length: PER_PAGE }, (_, i) => (
                <NftCardSkeleton key={i} />
              ))
            : visible.map((n) => <NftCard key={n.id} nft={n} />)}
        </ul>
      )}

      {pages > 1 && (
        <div
          className="mt-6 flex justify-center gap-2"
          role="group"
          aria-label={`Páginas: ${title}`}
        >
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              aria-label={`Página ${i + 1} de ${pages}`}
              aria-current={currentPage === i ? "true" : undefined}
              className={`h-2.5 w-2.5 rounded-full border border-accent ${
                currentPage === i ? "bg-accent" : ""
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
