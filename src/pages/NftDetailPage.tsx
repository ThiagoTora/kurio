import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { isAxiosError } from "axios";

import { nftDetailQuery, nftsQuery } from "@/api/nfts";
import { useAddToCart } from "@/api/cart";
import { apiErrorMessage } from "@/api/errors";
import { useSession } from "@/api/auth";
import { favoritesQuery, useToggleFavorite } from "@/api/account";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { NftCard, NftCardSkeleton } from "@/components/NftCard";
import { openAuthModal } from "@/lib/authModal";
import type { NftDetail } from "@/types/nft";

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span
      role="img"
      aria-label={`Nota ${value} de 5`}
      className="tracking-tight text-accent"
    >
      {"★".repeat(full)}
      {"☆".repeat(5 - full)}
    </span>
  );
}

export function NftDetailPage() {
  const { id } = useParams({ from: "/nft/$id" });
  const { data, isPending, isError, error, refetch } = useQuery(
    nftDetailQuery(id),
  );

  if (isPending) return <NftDetailSkeleton />;

  if (isError) {
    const notFound = isAxiosError(error) && error.response?.status === 404;
    return (
      <main className="mx-auto max-w-[1000px] px-4 py-20 text-center text-xs">
        <div role="alert">
          <h1 className="text-lg font-bold">
            {notFound
              ? "NFT não encontrado"
              : "Não foi possível carregar este NFT"}
          </h1>
          <p className="mt-2 text-muted">
            {notFound
              ? "O item não existe ou foi removido."
              : "Tente novamente em instantes."}
          </p>
          <div className="mt-6 flex justify-center gap-4">
            {!notFound && (
              <button
                onClick={() => refetch()}
                className="text-accent underline"
              >
                Tentar novamente
              </button>
            )}
            <Link
              to="/"
              search={{ tab: "all", sort: "recent", page: 1 }}
              className="text-accent underline"
            >
              Voltar ao catálogo
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <NftDetailContent key={data.id} nft={data} />;
}

function NftDetailContent({ nft }: { nft: NftDetail }) {
  const [imgIndex, setImgIndex] = useState(0);
  const navigate = useNavigate();
  const addToCart = useAddToCart();
  const defaultEdition =
    nft.editions.find((e) => e.label === "1/50" && e.available > 0) ??
    nft.editions.find((e) => e.available > 0) ??
    nft.editions[0];
  const [editionId, setEditionId] = useState(defaultEdition.id);
  const edition = nft.editions.find((e) => e.id === editionId)!;

  const [quantity, setQuantity] = useState(1);
  const max = edition.available;
  const qty = max === 0 ? 0 : Math.min(Math.max(quantity, 1), max);

  const [notice, setNotice] = useState("");
  const editionGroup = useId();
  const { user } = useSession();
  const { data: favs } = useQuery({ ...favoritesQuery(), enabled: !!user });
  const favorite = favs?.includes(nft.id) ?? false;
  const toggle = useToggleFavorite();
  // volta ao topo e reinicia estado ao trocar de NFT

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <main className="mx-auto max-w-[1000px] px-4 pb-10">
      <nav aria-label="Breadcrumb" className="py-4 text-[11px]">
        <ol className="flex gap-1">
          <li>
            <Link
              to="/"
              search={{ tab: "all", sort: "recent", page: 1 }}
              className="hover:text-accent"
            >
              Início
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page">Mercado</li>
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[72px_minmax(0,300px)_1fr]">
        {/* miniaturas */}
        <ul className="order-2 flex justify-center gap-2 lg:order-1 lg:flex-col lg:justify-start">
          {nft.images.map((src, i) => (
            <li key={i}>
              <button
                onClick={() => setImgIndex(i)}
                aria-label={`Ver imagem ${i + 1} de ${nft.images.length}`}
                aria-pressed={imgIndex === i}
                className={`block rounded-sm bg-surface p-1 ${imgIndex === i ? "outline outline-1 outline-accent" : ""}`}
              >
                <img
                  src={src}
                  alt=""
                  width={64}
                  height={64}
                  className="aspect-square w-16 rounded-sm object-cover"
                />
              </button>
            </li>
          ))}
        </ul>

        {/* imagem principal */}
        <div className="relative order-1 mx-auto w-full max-w-[420px] rounded-sm bg-surface p-3 lg:order-2 lg:mx-0 lg:max-w-none">
          <img
            src={nft.images[imgIndex]}
            alt={nft.name}
            width={300}
            height={300}
            fetchPriority="high"
            className="aspect-square w-full rounded-2xl object-cover"
          />

          <Dialog>
            <DialogTrigger asChild>
              <button
                aria-label="Ampliar imagem"
                className="absolute right-5 top-5 grid size-6 place-items-center rounded-full bg-background/70 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </button>
            </DialogTrigger>

            <DialogContent className="w-auto max-w-[92vw] p-3">
              <DialogTitle className="sr-only">
                Imagem ampliada de {nft.name}
              </DialogTitle>

              <DialogDescription className="sr-only">
                Visualização ampliada da imagem do NFT.
              </DialogDescription>

              <img
                src={nft.images[imgIndex]}
                alt={nft.name}
                className="max-h-[80vh] max-w-full rounded-md object-contain"
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* informações */}
        <section
          aria-labelledby="nft-title"
          className="order-3 min-w-0 text-xs"
        >
          <h1 id="nft-title" className="text-xl font-bold">
            {nft.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-accent">{nft.price} ETH</p>
            <Stars value={nft.rating} />
            <span className="text-[11px] text-muted">
              {nft.reviewsCount} avaliações de colecionadores
            </span>
          </div>

          <p className="mt-4 font-bold">Sobre este NFT:</p>
          <p className="mt-1 leading-relaxed text-muted">{nft.summary}</p>

          <fieldset className="mt-4">
            <legend className="font-bold">Edição:</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {nft.editions.map((e) => (
                <label
                  key={e.id}
                  className={
                    e.available === 0
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer"
                  }
                >
                  <input
                    type="radio"
                    name={editionGroup}
                    value={e.id}
                    checked={editionId === e.id}
                    disabled={e.available === 0}
                    onChange={() => setEditionId(e.id)}
                    className="peer sr-only"
                  />
                  <span className="inline-block rounded-full border border-border px-2 py-0.5 text-[11px] peer-checked:border-accent peer-checked:text-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                    {e.label}
                    {e.available === 0 && (
                      <span className="sr-only"> (esgotada)</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            {max === 0 && (
              <p role="status" className="mt-2 text-[11px] text-red-400">
                Edição esgotada.
              </p>
            )}
          </fieldset>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div
              className="flex items-center gap-2"
              role="group"
              aria-label="Quantidade"
            >
              <Button
                size="icon"
                className="rounded-full"
                onClick={() => setQuantity(Math.max(1, qty - 1))}
                disabled={qty <= 1}
                aria-label="Diminuir quantidade"
              >
                −
              </Button>

              <output aria-live="polite" className="w-6 text-center">
                {qty}
              </output>

              <Button
                size="icon"
                className="rounded-full"
                onClick={() => setQuantity(Math.min(max, qty + 1))}
                disabled={qty >= max}
                aria-label="Aumentar quantidade"
              >
                +
              </Button>
            </div>

            <Button
              disabled={max === 0 || addToCart.isPending}
              onClick={() => {
                setNotice("");

                addToCart.mutate(
                  {
                    nftId: nft.id,
                    editionId: edition.id,
                    quantity: qty,
                  },
                  {
                    onSuccess: () => {
                      navigate({ to: "/cart" });
                    },
                    onError: (error) => {
                      setNotice(apiErrorMessage(error));
                    },
                  },
                );
              }}
              className="ml-auto px-5"
            >
              {addToCart.isPending ? "ADICIONANDO..." : "COMPRAR"}
            </Button>

            <Button
              variant="outline"
              aria-pressed={favorite}
              aria-busy={toggle.isPending}
              onClick={() => {
                if (!user) {
                  openAuthModal({
                    mode: "login",
                    reason: "Entre para favoritar NFTs.",
                  });
                  return;
                }

                setNotice("");

                toggle.mutate(
                  { nftId: nft.id, favorite: !favorite },
                  {
                    onError: () =>
                      setNotice(
                        "Não foi possível atualizar seus favoritos. Tente novamente.",
                      ),
                  },
                );
              }}
            >
              {favorite ? "♥ Favoritado" : "♡ Favoritar"}
            </Button>
          </div>
          {qty >= max && max > 0 && (
            <p className="mt-2 text-[11px] text-muted">
              Limite de {max} unidade(s) para esta edição.
            </p>
          )}
          <p role="status" className="mt-2 min-h-4 text-[11px] text-muted">
            {notice}
          </p>

          <dl className="mt-4 space-y-2 text-muted">
            <div>
              <dt className="inline">ID do token: </dt>
              <dd className="inline">{nft.tokenId}</dd>
            </div>
            <div>
              <dt className="inline">Coleção: </dt>
              <dd className="inline">{nft.collectionName}</dd>
            </div>
            <div>
              <dt className="inline">Atributos: </dt>
              <dd className="inline">{nft.attributes.join(", ")}</dd>
            </div>
          </dl>

          <div className="mt-4 flex items-center gap-3">
            <span className="font-bold">Compartilhar este NFT:</span>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Compartilhar no LinkedIn"
              className="hover:text-accent"
            >
              in
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent(nft.name)}&body=${encodeURIComponent(shareUrl)}`}
              aria-label="Compartilhar por e-mail"
              className="hover:text-accent"
            >
              ✉
            </a>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(nft.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Compartilhar no X"
              className="hover:text-accent"
            >
              x
            </a>
          </div>
        </section>
      </div>

      <NftTabs nft={nft} />
      <RelatedNfts nft={nft} />
    </main>
  );
}

function NftTabs({ nft }: { nft: NftDetail }) {
  return (
    <Tabs defaultValue="details" className="mt-12 text-xs">
      <TabsList aria-label="Informações do NFT" className="gap-6">
        <TabsTrigger value="details">Detalhes do NFT</TabsTrigger>

        <TabsTrigger value="reviews">
          Avaliações de colecionadores ({nft.reviewsCount})
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="details"
        className="mt-4 space-y-3 leading-relaxed text-muted-foreground"
      >
        {nft.description.map((p, i) => (
          <p key={i}>{p}</p>
        ))}

        <p>
          <strong className="text-foreground">Rede:</strong>
          <br />
          Cunhado na Ethereum com procedência imutável e metadados armazenados
          no IPFS.
        </p>

        <p>
          <strong className="text-foreground">Contrato:</strong>
          <br />
          Direitos autorais do criador: {nft.royalty} nas vendas secundárias,
          pagos automaticamente pelos mercados compatíveis.
        </p>

        <p>
          <strong className="text-foreground">Direitos autorais:</strong>
          <br />
          {nft.contract}
        </p>
      </TabsContent>

      <TabsContent value="reviews" className="mt-4">
        <ul className="space-y-4">
          {nft.reviews.map((r) => (
            <li key={r.id} className="rounded-sm bg-surface p-3">
              <p className="flex items-center gap-2">
                <strong>{r.author}</strong>
                <Stars value={r.rating} />
              </p>

              <p className="mt-1 text-muted-foreground">{r.text}</p>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-[11px] text-muted-foreground">
          Exibindo {nft.reviews.length} de {nft.reviewsCount} avaliações.
        </p>
      </TabsContent>
    </Tabs>
  );
}
const PER_PAGE = 5;

function RelatedNfts({ nft }: { nft: NftDetail }) {
  const { data, isPending, isError, refetch } = useQuery(
    nftsQuery({
      tab: "all",
      sort: "recent",
      page: 1,
      collection: nft.collection,
    }),
  );
  const [page, setPage] = useState(0);

  const items = (data?.items ?? []).filter((n) => n.id !== nft.id);
  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const currentPage = page >= pages ? 0 : page;

  const visible = items.slice(
    currentPage * PER_PAGE,
    currentPage * PER_PAGE + PER_PAGE,
  );

  return (
    <section aria-labelledby="related-title" className="mt-12">
      <h2
        id="related-title"
        className="border-b border-border pb-2 text-xs font-bold text-accent"
      >
        Mais desta coleção
      </h2>

      {isError ? (
        <p role="alert" className="py-8 text-center text-xs">
          Não foi possível carregar a coleção.
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
          aria-label="Páginas da coleção"
        >
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              aria-label={`Página ${i + 1} de ${pages}`}
              aria-current={page === i ? "true" : undefined}
              className={`h-2.5 w-2.5 rounded-full border border-accent ${page === i ? "bg-accent" : ""}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function NftDetailSkeleton() {
  return (
    <main
      className="mx-auto max-w-[1000px] px-4 pb-10"
      aria-busy="true"
      aria-label="Carregando NFT"
    >
      <div className="skeleton my-4 h-3 w-32 rounded" />
      <div className="grid gap-6 lg:grid-cols-[72px_minmax(0,300px)_1fr]">
        <div className="order-2 flex gap-2 lg:order-1 lg:flex-col">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-[72px] w-[72px] rounded-sm" />
          ))}
        </div>
        <div className="skeleton order-1 aspect-square w-full rounded-sm lg:order-2" />
        <div className="order-3 space-y-3">
          <div className="skeleton h-6 w-2/3 rounded" />
          <div className="skeleton h-4 w-1/3 rounded" />
          <div className="skeleton h-16 w-full rounded" />
          <div className="skeleton h-6 w-1/2 rounded" />
          <div className="skeleton h-8 w-full rounded" />
        </div>
      </div>
      <div className="skeleton mt-12 h-32 w-full rounded" />
    </main>
  );
}
