import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cartQuery } from "@/api/cart";
import { useSession } from "@/api/auth";
import { openAuthModal } from "@/lib/authModal";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";

const HOME_SEARCH = { tab: "all", sort: "recent", page: 1 } as const;

// "Mercado" é o catálogo e todo o fluxo de compra
const MARKET_PATHS = ["/nft", "/cart", "/checkout", "/order"];

const linkCls = (active: boolean) =>
  active
    ? "text-primary underline underline-offset-8"
    : "text-muted-foreground hover:text-foreground";

// páginas fora do escopo da entrega: não fingem navegação
const OUT_OF_SCOPE = ["Criadores", "Aprenda"] as const;

export function Header() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const { user } = useSession();
  const { data: cart } = useQuery(cartQuery());
  const cartCount =
    cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const marketActive = MARKET_PATHS.some((p) => pathname.startsWith(p));

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({
      to: "/",
      search: (previous) => ({
        ...previous,
        tab: previous.tab ?? "all",
        sort: previous.sort ?? "recent",
        q: q.trim() || undefined,
        page: 1,
      }),
    });
    setOpen(false);
  }

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-4">
        <Link
          to="/"
          search={HOME_SEARCH}
          className="text-xs font-bold tracking-widest"
        >
          KURIO
        </Link>

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex gap-8 text-xs">
            <li>
              <Link
                to="/"
                search={HOME_SEARCH}
                aria-current={!marketActive ? "page" : undefined}
                className={linkCls(!marketActive)}
              >
                Início
              </Link>
            </li>
            <li>
              <Link
                to="/"
                search={HOME_SEARCH}
                hash="catalogo"
                aria-current={marketActive ? "page" : undefined}
                className={linkCls(marketActive)}
              >
                Mercado
              </Link>
            </li>
            {OUT_OF_SCOPE.map((label) => (
              <li key={label}>
                <span
                  aria-disabled="true"
                  title="Indisponível nesta demonstração"
                  className="cursor-not-allowed text-muted-foreground/50"
                >
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          {open ? (
            <form role="search" onSubmit={handleSearch}>
              <label className="sr-only" htmlFor="header-search">
                Buscar NFTs
              </label>
              <Input
                id="header-search"
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                }}
                className="h-8 w-40"
                placeholder="Buscar..."
              />
            </form>
          ) : (
            <button
              type="button"
              aria-label="Abrir busca"
              onClick={() => setOpen(true)}
              className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <svg
                width="16"
                height="16"
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
          )}

          <Link
            to="/cart"
            aria-label={`Carrinho, ${cartCount} itens`}
            className="relative rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M6 6h15l-2 9H8L6 3H3" />
              <circle cx="9" cy="20" r="1.5" />
              <circle cx="18" cy="20" r="1.5" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <Link
              to="/profile"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {user.username}
            </Link>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openAuthModal({ mode: "login" })}
            >
              Entrar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
