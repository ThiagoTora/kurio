import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cartQuery,
  useApplyCoupon,
  useRemoveCoupon,
  useRemoveItem,
  useUpdateQuantity,
} from "@/api/cart";
import { apiErrorMessage } from "@/api/errors";
import { NftCarousel } from "@/components/NftCarousel";
import type { Cart, CartItem } from "@/types/cart";
import { buttonVariants } from "@/components/ui/button-variants";

const HOME_SEARCH = { tab: "all", sort: "recent", page: 1 } as const;
const GRID = "md:grid-cols-[minmax(0,1fr)_80px_110px_90px_32px]";

export function CartPage() {
  const {
    data: cart,
    isPending,
    isError,
    isFetching,
    refetch,
  } = useQuery(cartQuery());
  const updateQty = useUpdateQuantity();
  const removeItem = useRemoveItem();
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const changeQuantity = (item: CartItem, quantity: number) => {
    setErrorMsg("");
    updateQty.mutate(
      { itemId: item.id, quantity },
      {
        onSuccess: () =>
          setMessage(`Quantidade de ${item.name} atualizada para ${quantity}.`),
        onError: (e) => setErrorMsg(apiErrorMessage(e)),
      },
    );
  };

  const remove = (item: CartItem) => {
    setErrorMsg("");
    removeItem.mutate(item.id, {
      onSuccess: () => setMessage(`${item.name} removido do carrinho.`),
      onError: (e) => setErrorMsg(apiErrorMessage(e)),
    });
  };

  return (
    <main className="mx-auto max-w-[1000px] px-4 pb-10">
      <nav aria-label="Breadcrumb" className="py-4 text-[11px]">
        <ol className="flex gap-1">
          <li>
            <Link to="/" search={HOME_SEARCH} className="hover:text-accent">
              Início
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to="/" search={HOME_SEARCH} className="hover:text-accent">
              Mercado
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page">Carrinho</li>
        </ol>
      </nav>
      <h1 className="sr-only">Carrinho de NFTs</h1>

      <p role="status" className="sr-only">
        {message}
      </p>
      {errorMsg && (
        <p
          role="alert"
          className="mb-3 rounded-sm border border-red-400/50 p-2 text-xs text-red-400"
        >
          {errorMsg}
        </p>
      )}

      {isError ? (
        <div role="alert" className="py-16 text-center text-xs">
          Não foi possível carregar o carrinho.
          <button
            onClick={() => refetch()}
            className="ml-2 text-accent underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : isPending ? (
        <CartSkeleton />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <CartTable
            cart={cart}
            onQuantity={changeQuantity}
            onRemove={remove}
            removing={removeItem.isPending}
          />
          <Summary cart={cart} busy={isFetching} />
        </div>
      )}

      <NftCarousel
        title="Colecionadores também viram"
        params={{ tab: "trending", sort: "recent", page: 1 }}
        excludeIds={cart?.items.map((i) => i.nftId)}
      />
    </main>
  );
}

function CartTable({
  cart,
  onQuantity,
  onRemove,
  removing,
}: {
  cart: Cart;
  onQuantity: (item: CartItem, q: number) => void;
  onRemove: (item: CartItem) => void;
  removing: boolean;
}) {
  if (cart.items.length === 0) {
    return (
      <div className="py-16 text-center text-xs">
        <p className="text-muted">Seu carrinho está vazio.</p>
        <Link
          to="/"
          search={HOME_SEARCH}
          className="mt-4 inline-block rounded-sm bg-accent px-4 py-2 font-bold text-bg"
        >
          Explorar NFTs
        </Link>
      </div>
    );
  }

  return (
    <section aria-label="Itens do carrinho" className="text-xs">
      <div
        className={`hidden grid-cols-1 gap-2 border-b border-accent/50 pb-2 font-bold md:grid ${GRID}`}
      >
        <span>NFTs</span>
        <span>Preço</span>
        <span>Edições</span>
        <span>Total</span>
        <span className="sr-only">Remover</span>
      </div>

      <ul className="mt-2 space-y-2">
        {cart.items.map((item) => (
          // src/pages/CartPage.tsx: substitui o <li> de cada item em CartTable
          <li
            key={item.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-sm bg-surface p-2 md:grid-cols-[minmax(0,1fr)_80px_110px_90px_32px]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Link
                to="/nft/$id"
                params={{ id: item.nftId }}
                className="shrink-0"
              >
                <img
                  src={item.image}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-sm object-cover"
                />
              </Link>
              <div className="min-w-0">
                <Link
                  to="/nft/$id"
                  params={{ id: item.nftId }}
                  className="block truncate font-bold hover:text-primary"
                >
                  {item.name}
                </Link>
                <p className="text-[10px] text-primary">
                  ID do token: {item.tokenId}
                </p>
              </div>
            </div>

            {/* no mobile fica em uma linha própria; no md vira 3 colunas da grade (display: contents) */}
            <div className="order-3 col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-2 md:contents md:border-0 md:pt-0">
              <p>
                <span className="mr-2 text-muted-foreground md:sr-only">
                  Preço:
                </span>
                {item.unitPrice} ETH
              </p>

              <div
                role="group"
                aria-label={`Quantidade de ${item.name}`}
                className="flex items-center gap-2"
              >
                <button
                  onClick={() => onQuantity(item, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  aria-label={`Diminuir quantidade de ${item.name}`}
                  className="grid size-7 place-items-center rounded-full bg-primary font-bold text-primary-foreground disabled:opacity-40 md:size-5"
                >
                  −
                </button>
                <output className="w-5 text-center">{item.quantity}</output>
                <button
                  onClick={() => onQuantity(item, item.quantity + 1)}
                  disabled={item.quantity >= item.available}
                  aria-label={`Aumentar quantidade de ${item.name}`}
                  className="grid size-7 place-items-center rounded-full bg-primary font-bold text-primary-foreground disabled:opacity-40 md:size-5"
                >
                  +
                </button>
              </div>

              <p className="font-bold text-primary">
                <span className="mr-2 font-normal text-muted-foreground md:sr-only">
                  Total:
                </span>
                {item.lineTotal} ETH
              </p>
            </div>

            {item.quantity > item.available && (
              <p
                role="alert"
                className="order-4 col-span-2 text-[10px] text-destructive md:col-span-full"
              >
                Disponível agora: {item.available}. Reduza a quantidade para
                continuar.
              </p>
            )}

            <button
              onClick={() => onRemove(item)}
              disabled={removing}
              aria-label={`Remover ${item.name} do carrinho`}
              className="col-start-2 row-start-1 justify-self-end p-1 text-muted-foreground hover:text-primary disabled:opacity-40 md:col-start-auto md:row-start-auto"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v7M14 10v7" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Summary({ cart, busy }: { cart: Cart; busy: boolean }) {
  const q = cart.quote;
  const empty = cart.items.length === 0;

  return (
    <aside
      aria-labelledby="summary-title"
      aria-busy={busy}
      className={`text-xs ${busy ? "opacity-70" : ""}`}
    >
      <h2
        id="summary-title"
        className="border-b border-accent/50 pb-2 font-bold"
      >
        Resumo da carteira
      </h2>

      <CouponForm appliedCode={q.couponCode} />

      <dl className="mt-4 space-y-3">
        <SummaryRow label="Subtotal" value={`${q.subtotal} ETH`} />
        <SummaryRow
          label="Desconto do lançamento"
          value={`(-) ${q.discount}`}
        />
        <SummaryRow
          label="Taxa de rede"
          value={`${q.networkFee} ETH`}
          hint="Taxa estimada"
        />
        <div className="flex justify-between border-t border-border pt-3 font-bold">
          <dt>Total</dt>
          <dd className="text-accent">{q.total} ETH</dd>
        </div>
      </dl>

      {empty ? (
        <Button className="mt-4 w-full" disabled>
          Conectar e finalizar
        </Button>
      ) : (
        <Link
          to="/checkout"
          className={buttonVariants({ className: "mt-4 w-full" })}
        >
          Conectar e finalizar
        </Link>
      )}

      <Link
        to="/"
        search={HOME_SEARCH}
        className="mt-1 block text-center text-accent hover:underline"
      >
        Continuar explorando
      </Link>
    </aside>
  );
}

function SummaryRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="text-right">
        {value}
        {hint && (
          <span className="block text-[10px] text-accent underline">
            {hint}
          </span>
        )}
      </dd>
    </div>
  );
}

function CouponForm({ appliedCode }: { appliedCode: string | null }) {
  const inputId = useId();
  const errorId = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const apply = useApplyCoupon();
  const remove = useRemoveCoupon();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("Informe um código promocional.");
      return;
    }

    apply.mutate(code, {
      onSuccess: () => setCode(""),
      onError: (err) => setError(apiErrorMessage(err)),
    });
  };

  return (
    <form onSubmit={submit} noValidate className="mt-4">
      <Label htmlFor={inputId} className="mb-1 block text-[11px] font-bold">
        Código promocional
      </Label>

      <div className="flex">
        <Input
          id={inputId}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Digite o código promocional..."
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 rounded-r-none text-[11px]"
        />

        <Button
          type="submit"
          disabled={apply.isPending}
          className="h-9 rounded-l-none"
        >
          {apply.isPending ? "..." : "Aplicar"}
        </Button>
      </div>

      <p
        id={errorId}
        role="alert"
        className="mt-1 min-h-4 text-[11px] text-destructive"
      >
        {error}
      </p>

      {appliedCode && (
        <p className="mt-1 text-[11px] text-muted-foreground" role="status">
          Cupom <strong className="text-primary">{appliedCode}</strong>{" "}
          aplicado.{" "}
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
            className="h-auto p-0 text-[11px]"
          >
            Remover
          </Button>
        </p>
      )}
    </form>
  );
}
function CartSkeleton() {
  return (
    <div
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]"
      aria-busy="true"
      aria-label="Carregando carrinho"
    >
      <div className="space-y-2">
        <div className="skeleton h-4 w-full rounded" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="skeleton h-14 w-full rounded-sm" />
        ))}
      </div>
      <div className="space-y-3">
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-8 w-full rounded" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-4 w-full rounded" />
        ))}
        <div className="skeleton h-9 w-full rounded" />
      </div>
    </div>
  );
}
