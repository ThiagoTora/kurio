import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";

const features = [
  {
    letter: "W",
    title: "Segurança da carteira",
    text: "Proteja sua carteira e colecione arte digital verificada com confiança.",
  },
  {
    letter: "C",
    title: "Criadores em destaque",
    text: "Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.",
  },
  {
    letter: "D",
    title: "Alertas de lançamentos",
    text: "Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.",
  },
];

const collections = [
  ["arte-digital", "Arte digital"],
  ["fotografia", "Fotografia"],
  ["musica", "Música"],
  ["arte-3d", "Arte 3D"],
  ["utilidade", "Utilidade"],
] as const;

const socials = [
  { label: "Facebook", short: "f" },
  { label: "Instagram", short: "ig" },
  { label: "Twitter", short: "x" },
  { label: "LinkedIn", short: "in" },
  { label: "YouTube", short: "yt" },
];

function Unavailable({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-disabled="true"
      title="Indisponível nesta demonstração"
      className="cursor-not-allowed"
    >
      {children}
    </span>
  );
}

function Newsletter() {
  const inputId = useId();
  const msgId = useId();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{
    kind: "error" | "info";
    text: string;
  } | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setMsg({ kind: "error", text: "Informe um e-mail válido." });
      return;
    }
    setMsg({
      kind: "info",
      text: "Newsletter indisponível nesta demonstração.",
    });
  };

  return (
    <div>
      <h2 className="text-xs font-bold leading-tight">
        Antecipe-se ao próximo lançamento
      </h2>
      <form onSubmit={onSubmit} noValidate className="mt-3">
        <label htmlFor={inputId} className="sr-only">
          E-mail
        </label>
        <div className="flex">
          <input
            id={inputId}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="digite seu e-mail..."
            aria-invalid={msg?.kind === "error"}
            aria-describedby={msg ? msgId : undefined}
            className="min-w-0 flex-1 bg-bg px-3 py-2 text-[11px] placeholder:text-muted"
          />
          <button
            type="submit"
            className="bg-accent px-3 text-xs font-bold text-bg hover:opacity-90"
          >
            Enviar
          </button>
        </div>
        <p
          id={msgId}
          role={msg?.kind === "error" ? "alert" : "status"}
          className={`mt-2 min-h-4 text-[11px] ${msg?.kind === "error" ? "text-red-400" : "text-muted"}`}
        >
          {msg?.text}
        </p>
      </form>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        Receba lançamentos selecionados, histórias de criadores e novidades do
        mercado.
      </p>
    </div>
  );
}

const colTitle = "mb-3 text-xs font-bold";
const colList = "space-y-2 text-[11px] text-muted";

export function Footer() {
  return (
    <footer className="mx-auto mt-20 max-w-[1200px] px-4 pb-6">
      <div className="bg-surface">
        <div className="grid gap-6 p-6 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.1fr]">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex flex-col gap-3 lg:border-r lg:border-accent/40 lg:pr-4"
            >
              <span
                aria-hidden
                className="grid h-12 w-12 place-items-center rounded-full bg-accent text-sm font-bold text-bg"
              >
                {f.letter}
              </span>
              <h3 className="text-xs font-bold">{f.title}</h3>
              <p className="text-[11px] leading-relaxed text-muted">{f.text}</p>
            </div>
          ))}
          <Newsletter />
        </div>

        <div className="grid gap-3 bg-[#3a2314] px-6 py-4 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
          <p className="font-bold">KURIO</p>
          <p>Feito para colecionadores, criadores e cultura</p>
          <p>contato@email.com</p>
          <p>+55 11 4002 8922</p>
        </div>

        <div className="grid gap-8 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          <nav aria-label="Meu perfil">
            <h2 className={colTitle}>Meu perfil</h2>
            <ul className={colList}>
              <li>
                <a href="/profile" className="hover:text-accent">
                  Meu perfil
                </a>
              </li>
              <li>
                <Unavailable>Minha coleção</Unavailable>
              </li>
              <li>
                <Unavailable>Atividade</Unavailable>
              </li>
              <li>
                <Unavailable>Estúdio do criador</Unavailable>
              </li>
              <li>
                <Unavailable>Lista de interesse</Unavailable>
              </li>
            </ul>
          </nav>

          <nav aria-label="Central de ajuda">
            <h2 className={colTitle}>Central de ajuda</h2>
            <ul className={colList}>
              <li>
                <Unavailable>Central de ajuda</Unavailable>
              </li>
              <li>
                <Unavailable>Como comprar NFTs</Unavailable>
              </li>
              <li>
                <Unavailable>Carteira e segurança</Unavailable>
              </li>
              <li>
                <Unavailable>Política do mercado</Unavailable>
              </li>
              <li>
                <Unavailable>Denunciar item</Unavailable>
              </li>
            </ul>
          </nav>

          <nav aria-label="Coleções">
            <h2 className={colTitle}>Coleções</h2>
            <ul className={colList}>
              {collections.map(([slug, label]) => (
                <li key={slug}>
                  <Link
                    to="/"
                    search={{
                      tab: "all",
                      sort: "recent",
                      page: 1,
                      collection: slug,
                    }}
                    className="hover:text-accent"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className={colTitle}>Redes sociais</h2>
            <ul className="flex gap-2">
              {socials.map((s) => (
                <li key={s.label}>
                  <span
                    role="img"
                    aria-label={`${s.label} (indisponível)`}
                    className="grid h-6 w-6 place-items-center rounded-sm border border-accent text-[10px] text-accent"
                  >
                    {s.short}
                  </span>
                </li>
              ))}
            </ul>

            <h2 className={`${colTitle} mt-6`}>Carteiras compatíveis</h2>
            <p className="inline-block rounded-sm border border-border bg-bg px-2 py-1 text-[9px] tracking-wide text-accent">
              METAMASK · WALLETCONNECT · COINBASE
            </p>
          </div>
        </div>

        <p className="bg-bg/60 py-3 text-center text-[11px] text-muted">
          © 2026 Kurio. Propriedade digital para todos.
        </p>
      </div>
    </footer>
  );
}
