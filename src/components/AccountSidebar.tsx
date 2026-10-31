import { Link, useNavigate } from "@tanstack/react-router";
import { useLogout } from "@/api/auth";

const HOME_SEARCH = { tab: "all", sort: "recent", page: 1 } as const;
const OUT_OF_SCOPE = [
  "Atividade",
  "Lista de interesse",
  "Ofertas",
  "Arquivos baixados",
  "Suporte",
];

export function AccountSidebar({ active }: { active: "profile" | "wallets" }) {
  const navigate = useNavigate();
  const logout = useLogout();

  const link = (
    to: "/profile" | "/wallets",
    key: typeof active,
    label: string,
  ) => (
    <li>
      <Link
        to={to}
        aria-current={active === key ? "page" : undefined}
        className={`block border-l-2 px-3 py-2 ${active === key ? "border-accent text-accent" : "border-transparent hover:text-accent"}`}
      >
        {label}
      </Link>
    </li>
  );

  return (
    <nav
      aria-label="Minha conta"
      className="self-start rounded-sm bg-surface text-xs"
    >
      <h2 className="px-3 pt-3 text-sm font-bold">Meu perfil</h2>
      <ul className="mt-2">
        {link("/profile", "profile", "Dados do perfil")}
        {link("/wallets", "wallets", "Carteiras")}
        {OUT_OF_SCOPE.map((l) => (
          <li key={l}>
            <span
              aria-disabled="true"
              title="Indisponível nesta demonstração"
              className="block cursor-not-allowed border-l-2 border-transparent px-3 py-2 text-muted"
            >
              {l}
            </span>
          </li>
        ))}
        <li className="border-t border-accent/50">
          <button
            onClick={() =>
              logout.mutate(undefined, {
                onSettled: () => navigate({ to: "/", search: HOME_SEARCH }),
              })
            }
            disabled={logout.isPending}
            className="block w-full px-3 py-3 text-left text-accent disabled:opacity-60"
          >
            Sair
          </button>
        </li>
      </ul>
    </nav>
  );
}
