import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { nftsQuery } from "@/api/nfts";
import { Hero } from "@/components/Hero";
import { FiltersDrawer, FiltersSidebar } from "@/components/FiltersSidebar";
import { NftCard, NftCardSkeleton } from "@/components/NftCard";
import { Pagination } from "@/components/Pagination";
import { PromoBanners } from "@/components/PromoBanners";
import { JournalSection } from "@/components/JournalSection";
import { openAuthModal } from "@/lib/authModal";
import { useSession } from "@/api/auth";
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tabs = [
  { id: "all", label: "Todos os NFTs" },
  { id: "new", label: "Novos lançamentos" },
  { id: "trending", label: "Em alta" },
] as const;

export function HomePage() {
  const search = useSearch({ from: "/" });
  const navigate = useNavigate({ from: "/" });
  const { data, isPending, isError, error, isFetching, refetch } = useQuery(
    nftsQuery(search),
  );

  const update = (patch: Partial<typeof search>) =>
    navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }),
    });

  const items = data?.items;

  const { user } = useSession();
  useEffect(() => {
    if (!search.auth) return;
    if (!user)
      openAuthModal({
        mode: search.auth,
        next: search.next,
        reason: "Entre para continuar.",
      });
    navigate({
      search: (prev) => ({ ...prev, auth: undefined, next: undefined }),
      replace: true,
    });
  }, [search.auth]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main>
      <Hero />

      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 lg:grid-cols-[190px_1fr]">
        <FiltersSidebar
          facets={data?.facets}
          search={search}
          onChange={update}
        />

        <section id="catalogo" aria-busy={isFetching} className="scroll-mt-4">
          <Tabs
            value={search.tab}
            onValueChange={(value) =>
              update({ tab: value as typeof search.tab })
            }
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 text-xs">
              <FiltersDrawer
                facets={data?.facets}
                search={search}
                onChange={update}
                total={data?.total}
              />
              <TabsList
                aria-label="Listagem"
                className="flex-wrap gap-x-4 gap-y-1 border-b-0"
              >
                {tabs.map((t) => (
                  <TabsTrigger key={t.id} value={t.id}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <label className="flex items-center gap-2 text-fg">
                Ordenar por:
                <select
                  value={search.sort}
                  onChange={(e) =>
                    update({ sort: e.target.value as typeof search.sort })
                  }
                  className="cursor-pointer bg-transparent text-fg"
                >
                  <option className="bg-bg" value="recent">
                    Listados recentemente
                  </option>
                  <option className="bg-bg" value="price_asc">
                    Menor preço
                  </option>
                  <option className="bg-bg" value="price_desc">
                    Maior preço
                  </option>
                  <option className="bg-bg" value="trending">
                    Em alta
                  </option>
                </select>
              </label>
            </div>

            <TabsContent value={search.tab}>
              {isError ? (
                <div
                  role="alert"
                  className="rounded border border-border p-6 text-center text-xs"
                >
                  Não foi possível carregar os NFTs.
                  <pre className="mt-2 whitespace-pre-wrap text-muted">
                    {String(error)}
                  </pre>
                  <button
                    onClick={() => refetch()}
                    className="mt-2 text-accent underline"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : items && items.length === 0 ? (
                <p className="p-10 text-center text-xs text-muted">
                  Nenhum NFT encontrado com esses filtros.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-8 md:grid-cols-3">
                  {isPending || !items
                    ? Array.from({ length: 9 }, (_, i) => (
                        <NftCardSkeleton key={i} />
                      ))
                    : items.map((n) => <NftCard key={n.id} nft={n} />)}
                </ul>
              )}

              {data?.items && (
                <Pagination
                  page={data.page}
                  total={data.total}
                  pageSize={data.pageSize}
                  onChange={(page) => update({ page })}
                />
              )}
            </TabsContent>
          </Tabs>
        </section>
      </div>

      <PromoBanners />
      <JournalSection />
    </main>
  );
}
