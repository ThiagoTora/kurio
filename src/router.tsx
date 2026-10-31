import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { z } from "zod";

import { sessionQuery } from "./api/auth";
import { queryClient } from "./lib/queryClient";

import { AuthModal } from "./components/AuthModal";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";

import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { HomePage } from "./pages/HomePage";
import { NftDetailPage } from "./pages/NftDetailPage";
import { OrderPage } from "./pages/OrderPage";
import { ProfilePage } from "./pages/ProfilePage";
import { WalletsPage } from "./pages/Walletspage";
import { RealtimeNotices } from "./components/RealtimeNotices";

// Parâmetros de busca da página inicial.
export const searchSchema = z.object({
  tab: z.enum(["all", "new", "trending"]).catch("all"),
  q: z.string().optional().catch(undefined),
  collection: z.string().optional().catch(undefined),
  network: z
    .enum(["ethereum", "polygon", "solana"])
    .optional()
    .catch(undefined),
  minPrice: z.string().optional().catch(undefined),
  maxPrice: z.string().optional().catch(undefined),
  sort: z
    .enum(["recent", "price_asc", "price_desc", "trending"])
    .catch("recent"),
  page: z.coerce.number().int().min(1).catch(1),
  auth: z.enum(["login", "signup"]).optional().catch(undefined),
  next: z.string().optional().catch(undefined),
});

// Proteção das rotas privadas.
const requireAuth = async ({ location }: { location: { href: string } }) => {
  const user = await queryClient.ensureQueryData(sessionQuery());

  if (!user) {
    throw redirect({
      to: "/",
      search: {
        tab: "all",
        sort: "recent",
        page: 1,
        auth: "login",
        next: location.href,
      },
    });
  }
};

// Layout principal.
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Header />
      <RealtimeNotices />
      <Outlet />
      <Footer />
      <AuthModal />
    </>
  ),

  notFoundComponent: () => <p className="p-8">Página não encontrada.</p>,

  errorComponent: ({ error }) => (
    <pre className="whitespace-pre-wrap p-8 text-xs text-red-400">
      {String(error)}
    </pre>
  ),
});

// Catálogo.
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: searchSchema,
  component: HomePage,
});

// Detalhes do NFT.
const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/nft/$id",
  component: NftDetailPage,
});

// Carrinho: disponível para visitantes e usuários autenticados.
const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cart",
  component: CartPage,
});

// Checkout: exige autenticação.
const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/checkout",
  beforeLoad: requireAuth,
  component: CheckoutPage,
});

// Pedido: exige autenticação.
const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/order/$id",
  beforeLoad: requireAuth,
  component: OrderPage,
});

// Perfil: exige autenticação.
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  beforeLoad: requireAuth,
  component: ProfilePage,
});

// Carteiras: exige autenticação.
const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wallets",
  beforeLoad: requireAuth,
  component: WalletsPage,
});

// Árvore de rotas.
const routeTree = rootRoute.addChildren([
  indexRoute,
  nftRoute,
  cartRoute,
  checkoutRoute,
  orderRoute,
  profileRoute,
  walletsRoute,
]);

export const router = createRouter({
  routeTree,
  scrollRestoration: true,
});

// Tipagem do TanStack Router.
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
