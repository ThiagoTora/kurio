import { useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { z } from "zod";
import { useLogin, useSignup } from "@/api/auth";
import { closeAuthModal, setAuthMode, useAuthModal } from "@/lib/authModal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { PasswordField, TextField } from "./FormFields";

type Errors = Record<string, string>;
const PW = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});

const signupSchema = z
  .object({
    username: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9_]{3,20}$/, "Use 3 a 20 letras, números ou _."),
    email: z.string().trim().email("E-mail inválido."),
    password: z
      .string()
      .regex(PW, "Mínimo de 8 caracteres, com letras e números."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

export function AuthModal() {
  const { open, mode, reason, next } = useAuthModal();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) closeAuthModal();
      }}
    >
      <DialogContent className="w-[min(92vw,380px)]">
        {open && (
          <AuthPanel key={mode} mode={mode} reason={reason} next={next} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AuthPanel({
  mode,
  reason,
  next,
}: {
  mode: "login" | "signup";
  reason?: string;
  next?: string;
}) {
  const router = useRouter();
  const login = useLogin();
  const signup = useSignup();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [info, setInfo] = useState("");
  const pending = login.isPending || signup.isPending;

  const focusFirst = (errs: Errors) =>
    (
      formRef.current?.elements.namedItem(
        Object.keys(errs)[0],
      ) as HTMLElement | null
    )?.focus();

  const done = () => {
    closeAuthModal();
    if (next && next.startsWith("/") && !next.startsWith("//"))
      router.history.push(next); // retorno ao fluxo anterior
  };

  const onError = (err: unknown) => {
    if (isAxiosError(err) && err.response) {
      const d = err.response.data as { message?: string; fields?: Errors };
      if (d.fields) {
        setErrors(d.fields);
        focusFirst(d.fields);
        return;
      }
      setFormError(d.message ?? "Não foi possível concluir. Tente novamente.");
    } else {
      setFormError("Sem conexão. Verifique sua rede e tente de novo.");
    }
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    setInfo("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = (mode === "login" ? loginSchema : signupSchema).safeParse(
      data,
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

    if (mode === "login") {
      login.mutate(parsed.data as { email: string; password: string }, {
        onSuccess: done,
        onError,
      });
    } else {
      const { username, email, password } = parsed.data as {
        username: string;
        email: string;
        password: string;
      };
      signup.mutate(
        { username, email, password },
        { onSuccess: done, onError },
      );
    }
  };

  const unavailable = (what: string) => () =>
    setInfo(`${what} indisponível nesta demonstração.`);

  const tab = (m: "login" | "signup", label: string) => (
    <button
      type="button"
      onClick={() => setAuthMode(m)}
      aria-current={mode === m ? "true" : undefined}
      className={`rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${mode === m ? "text-primary" : "hover:text-primary"}`}
    >
      {label}
    </button>
  );

  return (
    <>
      <DialogTitle className="flex justify-center gap-2">
        {tab("login", "Entrar")}
        <span aria-hidden>|</span>
        {tab("signup", "Criar conta")}
      </DialogTitle>

      {reason && (
        <p role="status" className="mt-3 text-center text-[11px] text-primary">
          {reason}
        </p>
      )}
      <DialogDescription className="mt-3 text-center">
        {mode === "login"
          ? "Entre para gerenciar seu carrinho, coleção e perfil de criador."
          : "Crie seu perfil de colecionador e comece sua coleção quando quiser."}
      </DialogDescription>

      <form
        ref={formRef}
        onSubmit={submit}
        noValidate
        className="mt-4 space-y-3"
      >
        {mode === "signup" && (
          <TextField
            name="username"
            label="Nome de usuário"
            required
            placeholder="Nome de usuário"
            autoComplete="username"
            error={errors.username}
          />
        )}
        <TextField
          name="email"
          type="email"
          label="E-mail"
          required
          autoComplete="email"
          placeholder={
            mode === "login" ? "contato@email.com" : "Digite seu e-mail..."
          }
          error={errors.email}
        />
        <PasswordField
          name="password"
          label="Senha"
          required
          placeholder="Senha"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          error={errors.password}
        />
        {mode === "signup" && (
          <PasswordField
            name="confirmPassword"
            label="Confirmar senha"
            required
            placeholder="Confirmar senha"
            autoComplete="new-password"
            error={errors.confirmPassword}
          />
        )}

        {mode === "login" && (
          <div className="text-right">
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-[11px]"
              onClick={unavailable("Recuperação de senha")}
            >
              Esqueceu a senha?
            </Button>
          </div>
        )}

        <p role="alert" className="min-h-4 text-[11px] text-destructive">
          {formError}
        </p>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
        </Button>
      </form>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Ou continue com
      </p>
      <div className="mt-2 space-y-2">
        {["Google", "Facebook"].map((p) => (
          <Button
            key={p}
            variant="ghost"
            onClick={unavailable(`Login com ${p}`)}
            className="w-full border border-border font-normal hover:border-primary hover:bg-transparent hover:text-foreground"
          >
            Continuar com {p}
          </Button>
        ))}
      </div>
      <p
        role="status"
        className="mt-2 min-h-4 text-center text-[11px] text-muted-foreground"
      >
        {info}
      </p>
    </>
  );
}
