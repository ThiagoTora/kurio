import { useRef, useState } from "react";
import { isAxiosError } from "axios";
import { z } from "zod";
import {
  useChangePassword,
  useSession,
  useSetAvatar,
  useUpdateProfile,
} from "@/api/auth";
import { apiErrorMessage } from "@/api/errors";
import { AccountSidebar } from "@/components/AccountSidebar";
import { EnsField, PasswordField, TextField } from "@/components/FormFields";

type Errors = Record<string, string>;
const PW = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const schema = z
  .object({
    displayName: z.string().trim().min(2, "Informe o nome de exibição."),
    username: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9_]{3,20}$/, "Use 3 a 20 letras, números ou _."),
    email: z.string().trim().email("E-mail inválido."),
    ensName: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]{3,}$/, "Nome ENS inválido (mín. 3, minúsculas)."),
    walletNickname: z.string().trim().min(2, "Informe o apelido da carteira."),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (!(v.currentPassword || v.newPassword || v.confirmPassword)) return;
    if (!v.currentPassword)
      ctx.addIssue({
        code: "custom",
        path: ["currentPassword"],
        message: "Informe a senha atual.",
      });
    if (!v.newPassword || !PW.test(v.newPassword))
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Mínimo de 8 caracteres, com letras e números.",
      });
    if (v.newPassword !== v.confirmPassword)
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "As senhas não coincidem.",
      });
  });

export function ProfilePage() {
  const { user } = useSession();
  const update = useUpdateProfile();
  const changePw = useChangePassword();
  const avatar = useSetAvatar();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [avatarError, setAvatarError] = useState("");

  if (!user) return null;

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
      await update.mutateAsync({
        displayName: v.displayName,
        username: v.username,
        email: v.email,
        ensName: v.ensName,
        walletNickname: v.walletNickname,
      });
      if (v.newPassword) {
        await changePw.mutateAsync({
          currentPassword: v.currentPassword!,
          newPassword: v.newPassword,
        });
        for (const n of ["currentPassword", "newPassword", "confirmPassword"]) {
          (formRef.current?.elements.namedItem(n) as HTMLInputElement).value =
            "";
        }
      }
      setStatus({ kind: "ok", text: "Alterações salvas." });
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

  const onAvatar = (file?: File) => {
    setAvatarError("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setAvatarError("Use PNG, JPG ou WebP.");
      return;
    }
    if (file.size > 200 * 1024) {
      setAvatarError("Imagem muito grande (máx. 200 KB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      avatar.mutate(String(reader.result), {
        onSuccess: () => setStatus({ kind: "ok", text: "Avatar atualizado." }),
        onError: (err) => setAvatarError(apiErrorMessage(err)),
      });
    reader.readAsDataURL(file);
  };

  return (
    <main className="mx-auto grid max-w-[1000px] gap-8 px-4 py-8 md:grid-cols-[200px_minmax(0,1fr)]">
      <AccountSidebar active="profile" />

      <section aria-labelledby="profile-title" className="text-xs">
        <h1 id="profile-title" className="mb-4 font-bold">
          Perfil do colecionador
        </h1>

        <form
          ref={formRef}
          key={user.id + user.email}
          onSubmit={submit}
          noValidate
          className="space-y-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              name="displayName"
              label="Nome de exibição"
              required
              defaultValue={user.displayName}
              error={errors.displayName}
            />
            <TextField
              name="username"
              label="Nome de usuário"
              required
              defaultValue={user.username}
              error={errors.username}
            />
            <TextField
              name="email"
              type="email"
              label="E-mail"
              required
              defaultValue={user.email}
              error={errors.email}
            />
            <EnsField defaultValue={user.ensName} error={errors.ensName} />
            <TextField
              name="walletNickname"
              label="Apelido da carteira"
              required
              defaultValue={user.walletNickname}
              error={errors.walletNickname}
            />

            <div>
              <p className="mb-1 text-[11px] font-bold">Avatar</p>
              <div className="flex items-center gap-3">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`Avatar de ${user.displayName}`}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-accent"
                  >
                    {user.displayName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <label className="cursor-pointer rounded-sm bg-accent px-3 py-1 text-[11px] font-bold text-bg has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-fg">
                  {avatar.isPending ? "Enviando..." : "Enviar"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      onAvatar(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={!user.avatar || avatar.isPending}
                  onClick={() =>
                    avatar.mutate(null, {
                      onError: (err) => setAvatarError(apiErrorMessage(err)),
                    })
                  }
                  className="text-accent underline disabled:opacity-40"
                >
                  Remover
                </button>
              </div>
              <p role="alert" className="mt-1 min-h-4 text-[11px] text-red-400">
                {avatarError}
              </p>
            </div>
          </div>

          <fieldset className="max-w-sm space-y-3">
            <legend className="mb-2 font-bold">Alterar senha</legend>
            <PasswordField
              name="currentPassword"
              label="Senha atual"
              autoComplete="current-password"
              error={errors.currentPassword}
            />
            <PasswordField
              name="newPassword"
              label="Nova senha"
              autoComplete="new-password"
              error={errors.newPassword}
            />
            <PasswordField
              name="confirmPassword"
              label="Confirmar nova senha"
              autoComplete="new-password"
              error={errors.confirmPassword}
            />
          </fieldset>

          <div>
            <button
              type="submit"
              disabled={update.isPending || changePw.isPending}
              className="rounded-sm bg-accent px-6 py-2 font-bold text-bg hover:opacity-90 disabled:opacity-60"
            >
              {update.isPending || changePw.isPending
                ? "Salvando..."
                : "Salvar"}
            </button>
            <p
              role={status?.kind === "error" ? "alert" : "status"}
              className={`mt-2 min-h-4 text-[11px] ${status?.kind === "error" ? "text-red-400" : "text-muted"}`}
            >
              {status?.text}
            </p>
          </div>
        </form>
      </section>
    </main>
  );
}
