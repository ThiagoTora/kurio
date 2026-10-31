import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { z } from "zod";
import { useRemoveSecondary, useSaveWallet, walletsQuery } from "@/api/account";
import { apiErrorMessage } from "@/api/errors";
import { AccountSidebar } from "@/components/AccountSidebar";
import { EnsField, SelectField, TextField } from "@/components/FormFields";
import type { Wallet } from "@/types/wallet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Errors = Record<string, string>;
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;

const schema = z.object({
  displayName: z.string().trim().min(2, "Informe o nome de exibição."),
  nickname: z.string().trim().min(2, "Informe o apelido da carteira."),
  network: z.enum(["ethereum", "polygon", "solana"], {
    message: "Selecione uma rede.",
  }),
  profileName: z.string().trim().min(2, "Informe o nome do perfil."),
  address: z
    .string()
    .trim()
    .regex(ADDRESS, "Endereço 0x inválido (42 caracteres)."),
  secondaryRef: z
    .string()
    .trim()
    .optional()
    .refine(
      (s) => !s || ADDRESS.test(s) || /^[a-z0-9-]+\.eth$/i.test(s),
      "Use um endereço 0x ou um nome .eth.",
    ),
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
});

export function WalletsPage() {
  const { data, isPending, isError, refetch } = useQuery(walletsQuery());
  const save = useSaveWallet();
  const removeSecondary = useRemoveSecondary();
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState("");

  const primary = data?.primary ?? null;
  const secondary = data?.secondary ?? null;
  const same = secondary?.sameAsPrimary === true;

  const toggleSame = (checked: boolean) => {
    setNote("");
    const opts = { onError: (e: unknown) => setNote(apiErrorMessage(e)) };
    if (checked)
      save.mutate({ kind: "secondary", wallet: { sameAsPrimary: true } }, opts);
    else removeSecondary.mutate(undefined, opts);
  };

  return (
    <main className="mx-auto grid max-w-[1000px] gap-8 px-4 py-8 md:grid-cols-[200px_minmax(0,1fr)]">
      <AccountSidebar active="wallets" />

      <div className="space-y-10 text-xs">
        {isPending ? (
          <div
            className="space-y-3"
            aria-busy="true"
            aria-label="Carregando carteiras"
          >
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton h-12 rounded-sm" />
            ))}
          </div>
        ) : isError ? (
          <p role="alert">
            Não foi possível carregar suas carteiras.
            <button
              onClick={() => refetch()}
              className="ml-2 text-accent underline"
            >
              Tentar novamente
            </button>
          </p>
        ) : (
          <>
            <section aria-labelledby="primary-title">
              <header className="flex items-start justify-between">
                <div>
                  <h1 id="primary-title" className="font-bold">
                    Carteira principal
                  </h1>
                  <p className="mt-1 text-[11px] text-muted">
                    Estas carteiras ficam disponíveis no pagamento e para
                    receber NFTs comprados.
                  </p>
                </div>
                <button
                  onClick={() =>
                    document.getElementById("primary-displayName")?.focus()
                  }
                  className="text-accent"
                >
                  {primary ? "Editar" : "Adicionar"}
                </button>
              </header>
              <WalletForm key="primary" kind="primary" wallet={primary} />
            </section>

            <section aria-labelledby="secondary-title">
              <header className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="secondary-title" className="font-bold">
                    Carteira secundária
                  </h2>
                  {!secondary && !adding && (
                    <p className="mt-1 text-[11px] text-muted">
                      Você ainda não adicionou uma carteira secundária.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-[11px]">
                    <Checkbox
                      id="same-as-primary"
                      checked={same}
                      disabled={
                        !primary || save.isPending || removeSecondary.isPending
                      }
                      onCheckedChange={(c) => toggleSame(c === true)}
                    />
                    <Label
                      htmlFor="same-as-primary"
                      className="mb-0 font-normal"
                    >
                      Igual à carteira principal
                    </Label>
                  </div>
                  {!secondary && !adding && (
                    <button
                      onClick={() => setAdding(true)}
                      className="text-accent"
                    >
                      Adicionar
                    </button>
                  )}
                </div>
              </header>
              <p role="alert" className="mt-1 min-h-4 text-[11px] text-red-400">
                {note}
              </p>

              {same && (
                <p className="mt-2 text-[11px] text-muted">
                  A carteira principal também será usada como secundária.
                </p>
              )}
              {secondary && !same && (
                <>
                  <WalletForm
                    key="secondary"
                    kind="secondary"
                    wallet={secondary}
                  />
                  <button
                    onClick={() =>
                      removeSecondary.mutate(undefined, {
                        onError: (e) => setNote(apiErrorMessage(e)),
                      })
                    }
                    className="mt-3 text-[11px] text-accent underline"
                  >
                    Remover carteira secundária
                  </button>
                </>
              )}
              {!secondary && adding && (
                <WalletForm
                  kind="secondary"
                  wallet={null}
                  onDone={() => setAdding(false)}
                  onCancel={() => setAdding(false)}
                />
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function WalletForm({
  kind,
  wallet,
  onDone,
  onCancel,
}: {
  kind: "primary" | "secondary";
  wallet: Wallet | null;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const save = useSaveWallet();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const id = (n: string) => `${kind}-${n}`;

  const focusFirst = (errs: Errors) =>
    (
      formRef.current?.elements.namedItem(
        Object.keys(errs)[0],
      ) as HTMLElement | null
    )?.focus();

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus(null);
    const parsed = schema.safeParse(
      Object.fromEntries(new FormData(e.currentTarget)),
    );
    if (!parsed.success) {
      const errs: Errors = {};
      for (const i of parsed.error.issues)
        errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      focusFirst(errs);
      return;
    }
    setErrors({});
    const v = parsed.data;

    try {
      await save.mutateAsync({
        kind,
        wallet: {
          displayName: v.displayName,
          nickname: v.nickname,
          network: v.network,
          profileName: v.profileName,
          address: v.address,
          secondaryRef: v.secondaryRef || undefined,
          walletType: v.walletType,
          referralCode: v.referralCode,
          email: v.email,
          ensName: `${v.ensName}${v.ensSuffix}`,
        },
      });
      setStatus({ kind: "ok", text: "Carteira salva." });
      onDone?.();
    } catch (err) {
      const fields = isAxiosError(err)
        ? (err.response?.data as { fields?: Errors } | undefined)?.fields
        : undefined;
      if (fields) {
        setErrors(fields);
        focusFirst(fields);
      } else setStatus({ kind: "error", text: apiErrorMessage(err) });
    }
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="mt-4">
      <div className="grid gap-x-4 gap-y-4 md:grid-cols-2">
        <TextField
          id={id("displayName")}
          name="displayName"
          label="Nome de exibição"
          required
          defaultValue={wallet?.displayName}
          error={errors.displayName}
        />
        <TextField
          id={id("nickname")}
          name="nickname"
          label="Apelido da carteira"
          required
          defaultValue={wallet?.nickname}
          error={errors.nickname}
        />
        <SelectField
          id={id("network")}
          name="network"
          label="Rede"
          required
          placeholder="Selecione uma rede"
          defaultValue={wallet?.network}
          options={[
            ["ethereum", "Ethereum"],
            ["polygon", "Polygon"],
            ["solana", "Solana"],
          ]}
          error={errors.network}
        />
        <TextField
          id={id("profileName")}
          name="profileName"
          label="Nome do perfil"
          required
          defaultValue={wallet?.profileName}
          error={errors.profileName}
        />
        <TextField
          id={id("address")}
          name="address"
          label="Endereço da carteira"
          required
          placeholder="Endereço 0x da carteira"
          defaultValue={wallet?.address}
          error={errors.address}
        />
        <TextField
          id={id("secondaryRef")}
          name="secondaryRef"
          label="ENS ou carteira secundária"
          hideLabel
          placeholder="ENS ou carteira secundária (opcional)"
          defaultValue={wallet?.secondaryRef}
          error={errors.secondaryRef}
        />
        <SelectField
          id={id("walletType")}
          name="walletType"
          label="Tipo de carteira"
          required
          placeholder="Selecione uma carteira"
          defaultValue={wallet?.walletType}
          options={[
            ["primary", "Principal"],
            ["secondary", "Secundária"],
          ]}
          error={errors.walletType}
        />
        <TextField
          id={id("referralCode")}
          name="referralCode"
          label="Código de indicação"
          required
          defaultValue={wallet?.referralCode}
          error={errors.referralCode}
        />
        <TextField
          id={id("email")}
          name="email"
          type="email"
          label="E-mail"
          required
          defaultValue={wallet?.email}
          error={errors.email}
        />
        <EnsField
          id={id("ensName")}
          defaultValue={wallet?.ensName.replace(/\.eth$/, "")}
          error={errors.ensName}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={save.isPending}
          className="rounded-sm bg-accent px-4 py-2 font-bold text-bg hover:opacity-90 disabled:opacity-60"
        >
          {save.isPending ? "Salvando..." : "Salvar carteira"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-accent underline"
          >
            Cancelar
          </button>
        )}
        <p
          role={status?.kind === "error" ? "alert" : "status"}
          className={`text-[11px] ${status?.kind === "error" ? "text-red-400" : "text-muted"}`}
        >
          {status?.text}
        </p>
      </div>
    </form>
  );
}
