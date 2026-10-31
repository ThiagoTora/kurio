import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { z } from "zod";
import { cartKey, cartQuery } from "@/api/cart";
import { useConnectWallet, useCreateOrder } from "@/api/order";
import { apiErrorMessage } from "@/api/errors";
import { keyFor } from "@/lib/idempotency";
import type { Cart } from "@/types/cart";
import type { Network } from "@/types/nft";
import { SelectField, TextField } from "@/components/FormFields";
import { walletsQuery } from "@/api/account";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type {
  Collector,
  WalletConnection,
  WalletProvider,
} from "@/types/order";
import { inputCls } from "@/components/FormFields-constants";
const HOME_SEARCH = { tab: "all", sort: "recent", page: 1 } as const;
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;

const schema = z
  .object({
    displayName: z.string().trim().min(2, "Informe o nome de exibição."),
    username: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9_]{3,20}$/, "Use 3 a 20 letras, números ou _."),
    network: z.enum(["ethereum", "polygon", "solana"], {
      message: "Selecione uma rede.",
    }),
    profileName: z.string().trim().min(2, "Informe o nome do perfil."),
    walletAddress: z
      .string()
      .trim()
      .regex(ADDRESS, "Endereço 0x inválido (42 caracteres)."),
    secondaryWallet: z.string().trim().optional(),
    walletType: z.enum(["primary", "secondary"], {
      message: "Selecione uma carteira.",
    }),
    referralCode: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9]{4,12}$/, "Use 4 a 12 letras ou números."),
    email: z.string().trim().email("E-mail inválido."),
    ensName: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]{3,}$/, "Nome ENS inválido (mín. 3, minúsculas)."),
    ensSuffix: z.literal(".eth"),
    useOtherWallet: z.boolean(),
    note: z.string().max(280, "Máximo de 280 caracteres.").optional(),
    provider: z.enum(["walletconnect", "metamask", "coinbase"], {
      message: "Selecione uma carteira para pagar.",
    }),
  })
  .superRefine((v, ctx) => {
    const s = v.secondaryWallet;
    if (v.useOtherWallet && !s) {
      ctx.addIssue({
        code: "custom",
        path: ["secondaryWallet"],
        message: "Informe a carteira secundária.",
      });
    } else if (s && !(ADDRESS.test(s) || /^[a-z0-9-]+\.eth$/i.test(s))) {
      ctx.addIssue({
        code: "custom",
        path: ["secondaryWallet"],
        message: "Use um endereço 0x ou um nome .eth.",
      });
    }
  });

type Errors = Record<string, string>;
type Draft = {
  collector: Collector;
  provider: WalletProvider;
  network: Network;
};

const PROVIDERS: { id: WalletProvider; label: string }[] = [
  { id: "walletconnect", label: "WalletConnect" },
  { id: "metamask", label: "MetaMask" },
  { id: "coinbase", label: "Coinbase Wallet" },
];
const providerLabel = (id: WalletProvider) =>
  PROVIDERS.find((p) => p.id === id)!.label;

export function CheckoutPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: cart, isPending, isError, refetch } = useQuery(cartQuery());
  const connect = useConnectWallet();
  const create = useCreateOrder();
  const { data: wallets } = useQuery(walletsQuery());
  const w = wallets?.primary;
  const overAvailable =
    cart?.items.filter((i) => i.quantity > i.available) ?? [];

  const formRef = useRef<HTMLFormElement>(null);
  const lock = useRef(false);

  const [errors, setErrors] = useState<Errors>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const [connected, setConnected] = useState<WalletConnection | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [changed, setChanged] = useState(false);
  const [step, setStep] = useState<"idle" | "connecting" | "sending">("idle");

  const focusFirst = (errs: Errors) => {
    const first = Object.keys(errs)[0];
    (formRef.current?.elements.namedItem(first) as HTMLElement | null)?.focus();
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setChanged(false);
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      ...Object.fromEntries(fd),
      useOtherWallet: fd.has("useOtherWallet"),
    });

    if (!parsed.success) {
      const errs: Errors = {};
      for (const issue of parsed.error.issues)
        errs[String(issue.path[0])] ??= issue.message;
      setErrors(errs);
      focusFirst(errs);
      return;
    }

    setErrors({});
    const v = parsed.data;
    setDialogError("");
    setDraft({
      provider: v.provider,
      network: v.network,
      collector: {
        displayName: v.displayName,
        username: v.username,
        profileName: v.profileName,
        email: v.email,
        walletAddress: v.walletAddress,
        secondaryWallet: v.secondaryWallet || undefined,
        walletType: v.walletType,
        referralCode: v.referralCode,
        ensName: `${v.ensName}${v.ensSuffix}`,
        note: v.note || undefined,
      },
    });
  };

  const shownTotal = useRef<string | null>(null);
  useEffect(() => {
    const total = cart?.quote.total ?? null;
    if (
      draft &&
      shownTotal.current &&
      total &&
      total !== shownTotal.current &&
      step === "idle"
    ) {
      setDraft(null);
      setChanged(true); // exige nova confirmação do usuário
    }
    shownTotal.current = draft ? total : null;
  }, [cart?.quote.total, draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeDialog = () => {
    if (step === "idle") setDraft(null);
  };

  const submitOrder = async () => {
    if (!draft || !cart || lock.current) return; // trava clique repetido
    lock.current = true;
    setDialogError("");
    try {
      let wallet = connected;
      if (
        !wallet ||
        wallet.provider !== draft.provider ||
        wallet.network !== draft.network
      ) {
        setStep("connecting");
        wallet = await connect.mutateAsync({
          provider: draft.provider,
          network: draft.network,
        });
        setConnected(wallet);
      }

      setStep("sending");
      const body = { ...draft, expectedTotal: cart.quote.total };
      const order = await create.mutateAsync({ body, key: keyFor(body) });
      navigate({ to: "/order/$id", params: { id: order.id } });
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        setDraft(null);
        setDialogError("");
        return;
      }

      if (isAxiosError(err) && err.response) {
        const data = err.response.data as {
          code?: string;
          message?: string;
          cart?: Cart;
          fields?: Errors;
        };
        if (err.response.status === 409 && data.cart) {
          qc.setQueryData(cartKey, data.cart); // reconcilia com a cotação atual
          setChanged(true);
          setDraft(null);
        } else if (err.response.status === 422 && data.fields) {
          setErrors(data.fields);
          setDraft(null);
          focusFirst(data.fields);
        } else if (data.code === "WALLET_REJECTED") {
          setConnected(null);
          setDialogError(data.message ?? "A carteira recusou a conexão.");
        } else {
          setDialogError(apiErrorMessage(err));
        }
      } else {
        setDialogError(
          "Não recebemos resposta do servidor. Seu pedido pode ter sido criado: tente novamente, pois a mesma tentativa não gera pedido duplicado.",
        );
      }
    } finally {
      lock.current = false;
      setStep("idle");
    }
  };

  if (isPending) return <CheckoutSkeleton />;
  if (isError) {
    return (
      <main
        className="mx-auto max-w-[1000px] px-4 py-16 text-center text-xs"
        role="alert"
      >
        Não foi possível carregar o carrinho.
        <button
          onClick={() => refetch()}
          className="ml-2 text-accent underline"
        >
          Tentar novamente
        </button>
      </main>
    );
  }
  if (cart.items.length === 0) {
    return (
      <main className="mx-auto max-w-[1000px] px-4 py-16 text-center text-xs">
        <p className="text-muted">Seu carrinho está vazio.</p>
        <Link
          to="/"
          search={HOME_SEARCH}
          className="mt-4 inline-block rounded-sm bg-accent px-4 py-2 font-bold text-bg"
        >
          Explorar NFTs
        </Link>
      </main>
    );
  }

  const q = cart.quote;

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
            <Link to="/cart" className="hover:text-accent">
              Mercado
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page">Pagamento</li>
        </ol>
      </nav>
      <h1 className="sr-only">Pagamento</h1>

      {changed && (
        <p
          role="alert"
          className="mb-4 rounded-sm border border-accent p-3 text-xs text-accent"
        >
          O preço ou a disponibilidade mudaram. Revise o resumo atualizado e
          confirme a compra novamente.
        </p>
      )}

      <form
        key={w?.address ?? "empty"}
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]"
      >
        {/* Perfil do colecionador */}
        <section aria-labelledby="profile-title" className="text-xs">
          <h2 id="profile-title" className="mb-4 font-bold">
            Perfil do colecionador
          </h2>
          <div className="grid gap-x-4 gap-y-4 md:grid-cols-2">
            <TextField
              name="displayName"
              label="Nome de exibição"
              required
              defaultValue={w?.displayName ?? ""}
              error={errors.displayName}
            />
            <TextField
              name="username"
              label="Nome de usuário"
              required
              error={errors.username}
            />
            <SelectField
              name="network"
              label="Rede"
              required
              placeholder="Selecione uma rede"
              defaultValue={w?.network ?? ""}
              error={errors.network}
              options={[
                ["ethereum", "Ethereum"],
                ["polygon", "Polygon"],
                ["solana", "Solana"],
              ]}
            />
            <TextField
              name="profileName"
              label="Nome do perfil"
              required
              defaultValue={w?.profileName ?? ""}
              error={errors.profileName}
            />
            <TextField
              name="walletAddress"
              label="Endereço da carteira"
              required
              placeholder="Endereço 0x da carteira"
              defaultValue={w?.address ?? ""}
              error={errors.walletAddress}
            />
            <TextField
              name="secondaryWallet"
              label="ENS ou carteira secundária"
              hideLabel
              placeholder="ENS ou carteira secundária (opcional)"
              defaultValue={w?.secondaryRef ?? ""}
              error={errors.secondaryWallet}
            />
            <SelectField
              name="walletType"
              label="Tipo de carteira"
              required
              placeholder="Selecione uma carteira"
              defaultValue={w?.walletType ?? ""}
              error={errors.walletType}
              options={[
                ["primary", "Principal"],
                ["secondary", "Secundária"],
              ]}
            />
            <TextField
              name="referralCode"
              label="Código de indicação"
              required
              defaultValue={w?.referralCode ?? ""}
              error={errors.referralCode}
            />
            <TextField
              name="email"
              type="email"
              label="E-mail"
              required
              defaultValue={w?.email ?? ""}
              error={errors.email}
            />
            <div>
              <label
                htmlFor="ensName"
                className="mb-1 block text-[11px] font-bold"
              >
                Nome ENS
                <span aria-hidden className="text-accent">
                  {" "}
                  *
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  id="ensName"
                  name="ensName"
                  aria-required="true"
                  aria-invalid={!!errors.ensName}
                  aria-describedby={
                    errors.ensName ? "ensName-error" : undefined
                  }
                  className={inputCls}
                />
                <select
                  name="ensSuffix"
                  aria-label="Sufixo ENS"
                  className={`${inputCls} w-20`}
                >
                  <option value=".eth">.eth</option>
                </select>
              </div>
              {errors.ensName && (
                <p id="ensName-error" className="mt-1 text-[11px] text-red-400">
                  {errors.ensName}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 md:col-span-2">
              <Checkbox id="useOtherWallet" name="useOtherWallet" />
              <Label htmlFor="useOtherWallet" className="mb-0 font-normal">
                Usar outra carteira?
              </Label>
            </div>

            <div className="md:col-span-1">
              <Label htmlFor="note">
                Observação do colecionador (opcional)
              </Label>
              <Textarea
                id="note"
                name="note"
                rows={5}
                aria-invalid={!!errors.note}
                aria-describedby={errors.note ? "note-error" : undefined}
              />
              {errors.note && (
                <p id="note-error" className="mt-1 text-[11px] text-red-400">
                  {errors.note}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Seus NFTs + carteira */}
        <aside aria-labelledby="items-title" className="text-xs">
          <h2 id="items-title" className="font-bold">
            Seus NFTs
          </h2>
          <div className="mt-2 flex justify-between border-b border-accent/50 pb-1 text-[11px] font-bold">
            <span>NFTs</span>
            <span>Subtotal</span>
          </div>

          <ul className="mt-2 space-y-2">
            {cart.items.map((i) => (
              <li
                key={i.id}
                className="flex items-center gap-2 rounded-sm bg-surface p-2"
              >
                <img
                  src={i.image}
                  alt=""
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-sm object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{i.name}</p>
                  <p className="text-[10px] text-accent">
                    ID do token: {i.tokenId}
                  </p>
                </div>
                <span className="text-[10px] text-muted">(x {i.quantity})</span>
                <span className="font-bold text-accent">{i.lineTotal} ETH</span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-center text-[11px] text-muted">
            Tem um código promocional?{" "}
            <Link to="/cart" className="text-accent underline">
              Aplique aqui
            </Link>
          </p>

          <dl className="mt-3 space-y-2" aria-busy={false}>
            <Row label="Subtotal" value={`${q.subtotal} ETH`} />
            <Row label="Desconto do lançamento" value={`(-) ${q.discount}`} />
            <Row
              label="Taxa de rede"
              value={`${q.networkFee} ETH`}
              hint="Taxa estimada"
            />
            <div className="flex justify-between border-t border-border pt-2 font-bold">
              <dt>Total</dt>
              <dd className="text-accent">{q.total} ETH</dd>
            </div>
          </dl>

          <fieldset className="mt-4">
            <legend className="mb-2 w-full text-center font-bold">
              Carteira e rede
            </legend>
            <RadioGroup
              name="provider"
              defaultValue="coinbase"
              aria-label="Carteira e rede"
              aria-describedby={errors.provider ? "provider-error" : undefined}
              onValueChange={() => setConnected(null)}
            >
              {PROVIDERS.map((p) => (
                <RadioGroupItem key={p.id} value={p.id}>
                  {p.label}
                </RadioGroupItem>
              ))}
            </RadioGroup>
            {errors.provider && (
              <p
                id="provider-error"
                className="mt-1 text-[11px] text-destructive"
              >
                {errors.provider}
              </p>
            )}
            {errors.provider && (
              <p id="provider-error" className="mt-1 text-[11px] text-red-400">
                {errors.provider}
              </p>
            )}

            {connected && (
              <p role="status" className="mt-2 text-[11px] text-muted">
                Conectado: {providerLabel(connected.provider)} (
                {connected.address.slice(0, 6)}…{connected.address.slice(-4)}){" "}
                <button
                  type="button"
                  onClick={() => setConnected(null)}
                  className="text-accent underline"
                >
                  Desconectar
                </button>
              </p>
            )}
          </fieldset>
          <Button
            type="submit"
            disabled={overAvailable.length > 0}
            className="mt-4 w-full"
          >
            Confirmar compra
          </Button>
          {overAvailable.length > 0 && (
            <p role="alert" className="mt-2 text-[11px] text-red-400">
              Ajuste o carrinho: {overAvailable.map((i) => i.name).join(", ")}{" "}
              sem estoque suficiente.
            </p>
          )}
        </aside>
      </form>

      {/* Revisão antes do envio */}
      <Dialog
        open={!!draft}
        onOpenChange={(o) => {
          if (!o && step === "idle") setDraft(null);
        }}
      >
        <DialogContent
          showClose={step === "idle"}
          onEscapeKeyDown={(e) => {
            if (step !== "idle") e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (step !== "idle") e.preventDefault();
          }}
        >
          <DialogTitle>Revise seu pedido</DialogTitle>
          <DialogDescription className="sr-only">
            Confira os dados antes de enviar o pedido.
          </DialogDescription>
          {draft && (
            <>
              {/* <dl> com os itens, carteira, rede, endereço, e-mail e total: igual ao anterior */}
              <p
                role="status"
                className="mt-3 min-h-4 text-[11px] text-muted-foreground"
              >
                {step === "connecting" &&
                  `Conectando à ${providerLabel(draft.provider)}...`}
                {step === "sending" && "Enviando pedido..."}
              </p>
              {dialogError && (
                <p role="alert" className="mt-1 text-[11px] text-destructive">
                  {dialogError}
                </p>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={closeDialog}
                  disabled={step !== "idle"}
                >
                  Voltar e editar
                </Button>
                <Button onClick={submitOrder} disabled={step !== "idle"}>
                  {dialogError ? "Tentar novamente" : "Enviar pedido"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Row({
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

function CheckoutSkeleton() {
  return (
    <main
      className="mx-auto max-w-[1000px] px-4 pb-10"
      aria-busy="true"
      aria-label="Carregando pagamento"
    >
      <div className="skeleton my-4 h-3 w-40 rounded" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="skeleton h-14 rounded-sm" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="skeleton h-12 rounded-sm" />
          ))}
          <div className="skeleton h-24 rounded-sm" />
          <div className="skeleton h-9 rounded-sm" />
        </div>
      </div>
    </main>
  );
}
