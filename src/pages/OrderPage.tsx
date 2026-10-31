import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { cartKey } from "@/api/cart";
import { orderQuery } from "@/api/order";
import { clearKey } from "@/lib/idempotency";
import type { Order, WalletProvider } from "@/types/order";
import { useSocketConnected } from "@/lib/realtime";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button-variants";

const HOME_SEARCH = { tab: "all", sort: "recent", page: 1 } as const;

export function OrderPage() {
  const { id } = useParams({ from: "/order/$id" });
  const qc = useQueryClient();
  const connected = useSocketConnected();

  const {
    data: order,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    ...orderQuery(id),
    refetchInterval: (q) =>
      q.state.data?.status === "pending" && !connected ? 3000 : false,
  });

  // Estados terminais: libera a chave de idempotência e atualiza o carrinho.
  useEffect(() => {
    if (order && order.status !== "pending") {
      clearKey();
      qc.invalidateQueries({ queryKey: cartKey });
    }
  }, [order?.status, qc]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isPending) {
    return (
      <main
        className="mx-auto max-w-[700px] space-y-3 px-4 py-10"
        aria-busy="true"
        aria-label="Carregando pedido"
      >
        <div className="skeleton h-8 w-1/2 rounded" />
        <div className="skeleton h-40 w-full rounded" />
      </main>
    );
  }

  if (isError) {
    const notFound = isAxiosError(error) && error.response?.status === 404;

    return (
      <main
        className="mx-auto max-w-[700px] px-4 py-16 text-center text-xs"
        role="alert"
      >
        <h1 className="text-lg font-bold">
          {notFound
            ? "Pedido não encontrado"
            : "Não foi possível carregar o pedido"}
        </h1>

        {!notFound && (
          <button
            onClick={() => refetch()}
            className="mt-3 text-accent underline"
          >
            Tentar novamente
          </button>
        )}

        <Link
          to="/"
          search={HOME_SEARCH}
          className="ml-3 text-accent underline"
        >
          Voltar ao catálogo
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[700px] px-4 py-10 text-xs">
      {order.status === "pending" && (
        <div role="status" aria-live="polite">
          <h1 className="text-lg font-bold">Processando pagamento...</h1>
          <p className="mt-2 text-muted">
            Aguardando a confirmação da rede. Você pode recarregar esta página:
            seu pedido será recuperado sem criar outra compra.
          </p>
          <div className="skeleton mt-4 h-2 w-full rounded" />
        </div>
      )}

      {order.status === "declined" && (
        <div role="alert">
          <h1 className="text-lg font-bold text-red-400">Pagamento recusado</h1>
          <p className="mt-2 text-muted">{order.declineReason}</p>
          <p className="mt-1 text-muted">Seus itens continuam no carrinho.</p>

          <Link
            to="/checkout"
            className="mt-4 inline-block rounded-sm bg-accent px-4 py-2 font-bold text-bg"
          >
            Voltar ao pagamento
          </Link>
        </div>
      )}

      {order.status === "confirmed" && (
        <>
          <h1 className="sr-only">Pedido confirmado</h1>
          <ConfirmationModal order={order} />
        </>
      )}
    </main>
  );
}

const PROVIDER_LABEL: Record<WalletProvider, string> = {
  walletconnect: "WalletConnect",
  metamask: "MetaMask",
  coinbase: "Coinbase Wallet",
};

const EXPLORER: Record<
  Order["network"],
  { label: string; url: (hash: string) => string }
> = {
  ethereum: {
    label: "Etherscan",
    url: (hash) => `https://etherscan.io/tx/${hash}`,
  },
  polygon: {
    label: "Polygonscan",
    url: (hash) => `https://polygonscan.com/tx/${hash}`,
  },
  solana: {
    label: "Solscan",
    url: (hash) => `https://solscan.io/tx/${hash}`,
  },
};

function formatDate(iso: string) {
  const date = new Date(iso);

  const month = date
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");

  return `${date.getDate()} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${date.getFullYear()}`;
}

function ConfirmationModal({ order }: { order: Order }) {
  const navigate = useNavigate();

  const close = () => navigate({ to: "/", search: HOME_SEARCH });
  const explorer = EXPLORER[order.network];
  const hash = order.txHash ?? "";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="w-[min(94vw,480px)]">
        <div className="text-center">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            className="mx-auto text-primary"
            role="img"
            aria-label="Obrigado"
          >
            <rect
              x="6"
              y="10"
              width="28"
              height="26"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M14 10V7a6 6 0 0 1 12 0v3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <text
              x="20"
              y="26"
              textAnchor="middle"
              fontSize="6"
              fill="currentColor"
            >
              THANK YOU
            </text>
          </svg>

          <DialogTitle className="mt-3 text-primary">
            Seus NFTs agora estão na sua carteira
          </DialogTitle>

          <DialogDescription className="sr-only">
            Resumo da transação confirmada.
          </DialogDescription>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-primary/40 py-3 text-[11px] md:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">ID da transação</dt>
            <dd className="font-bold">
              {hash.slice(0, 6)}…{hash.slice(-4)}
            </dd>
          </div>

          <div>
            <dt className="text-muted-foreground">Data</dt>
            <dd className="font-bold">{formatDate(order.createdAt)}</dd>
          </div>

          <div>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-bold">{order.quote.total} ETH</dd>
          </div>

          <div>
            <dt className="text-muted-foreground">Carteira</dt>
            <dd className="font-bold">{PROVIDER_LABEL[order.provider]}</dd>
          </div>
        </dl>

        <section aria-labelledby="tx-details" className="mt-4">
          <h3 id="tx-details" className="font-bold">
            Detalhes da transação
          </h3>

          <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-border pb-1 text-[11px] font-bold">
            <span>NFTs</span>
            <span>Edições</span>
            <span className="text-right">Subtotal</span>
          </div>

          <ul className="mt-2 space-y-2">
            {order.items.map((item) => (
              <li
                key={item.nftId + item.editionLabel}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <img
                    src={item.image}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-sm object-cover"
                  />

                  <div className="min-w-0">
                    <p className="truncate font-bold">{item.name}</p>
                    <p className="text-[10px] text-primary">
                      ID do token: {item.tokenId}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] text-muted-foreground">
                  (x {item.quantity})
                </span>

                <span className="text-right font-bold text-primary">
                  {item.lineTotal} ETH
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-3 space-y-1 text-right">
            {order.quote.discount !== "0.00" && (
              <div className="flex justify-between">
                <dt>Desconto</dt>
                <dd>(-) {order.quote.discount} ETH</dd>
              </div>
            )}

            <div className="flex justify-between">
              <dt>Taxa</dt>
              <dd>{order.quote.networkFee} ETH</dd>
            </div>

            <div className="flex justify-between border-t border-border pt-1 font-bold">
              <dt>Total</dt>
              <dd className="text-primary">{order.quote.total} ETH</dd>
            </div>
          </dl>
        </section>

        <p className="mt-4 border-t border-border pt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
          Transação confirmada na{" "}
          {order.network === "ethereum"
            ? "Ethereum"
            : order.network === "polygon"
              ? "Polygon"
              : "Solana"}
          . A propriedade foi transferida para sua carteira conectada e
          registrada na rede.
        </p>

        <div className="mt-4 text-center">
          <a
            href={explorer.url(hash)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants()}
          >
            Ver no {explorer.label}
          </a>

          <p className="mt-2 text-[10px] text-muted-foreground">
            Referência de transação simulada para esta demonstração.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
