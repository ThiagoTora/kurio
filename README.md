# Kurio — Marketplace de NFTs

Marketplace de NFTs em React + TypeScript (desafio frontend). Catálogo, detalhe, carrinho, pagamento, recibo, login/cadastro, perfil e carteiras, com **API, autenticação, carteiras e pagamentos simulados no navegador via MSW** (sem backend). O tempo real usa `socket.io-client` contra um servidor Socket.IO simulado, também via MSW.

## Stack

| Responsabilidade              | Tecnologia                                            |
| ----------------------------- | ----------------------------------------------------- |
| Interface / linguagem         | React + TypeScript (Vite)                             |
| Roteamento                    | TanStack Router                                       |
| Estado remoto                 | TanStack Query                                        |
| Cliente HTTP                  | Axios                                                 |
| Tempo real                    | Socket.IO (`socket.io-client`)                        |
| Estilização / componentes     | Tailwind CSS v4 + shadcn/ui (Radix)                   |
| Mocking                       | MSW (REST + WebSocket via `@mswjs/socket.io-binding`) |
| Testes E2E e regressão visual | Playwright                                            |
| Validação de formulários      | Zod                                                   |
| Valores em ETH                | `decimal.js` (strings decimais, sem ponto flutuante)  |

## Começando

Requisitos: **Node.js 20 ou superior** e npm.

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. No console do navegador deve aparecer `[MSW] Mocking enabled.`; é o sinal de que a "API" está de pé.

> Não há backend para subir. O MSW roda no próprio navegador (Service Worker), por isso **o primeiro carregamento registra o worker** e, se algo parecer travado em skeleton, recarregue com Ctrl+Shift+R.

### Outros comandos

| Comando                   | O que faz                                            |
| ------------------------- | ---------------------------------------------------- |
| `npm run dev`             | Desenvolvimento com mocks ativos                     |
| `npm run build`           | Verifica tipos e gera o build otimizado (`dist/`)    |
| `npm run preview`         | Serve o build de produção em `http://localhost:4173` |
| `npm run typecheck`       | Verificação de tipos (`tsc -b`)                      |
| `npm run lint`            | ESLint                                               |
| `npm run test:e2e`        | Testes Playwright (desktop e mobile)                 |
| `npm run test:e2e:update` | Regenera as baselines da regressão visual            |
| `npm run test:e2e:report` | Abre o relatório HTML do Playwright                  |

Na primeira vez, instale o navegador dos testes: `npx playwright install chromium`.

## Variáveis de ambiente

| Variável            | Padrão | Descrição                                                                                            |
| ------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| `VITE_ENABLE_MOCKS` | ligado | `false` desliga o MSW (a aplicação passa a chamar `/api` real). Em dev os mocks ficam ligados sempre |
| `VITE_HTTP_TIMEOUT` | `8000` | Timeout das requisições em ms. O build de teste (`.env.e2e`) usa `2000`                              |

Crie arquivos `.env.*` **pelo editor, em UTF-8**. No Windows, `echo "X=1" > .env` gera UTF-16 e o Vite ignora o arquivo.

## Credenciais fictícias

| Usuário | E-mail            | Senha       |
| ------- | ----------------- | ----------- |
| Ana     | `ana@kurio.dev`   | `Kurio@123` |
| Bruno   | `bruno@kurio.dev` | `Kurio@123` |

Você também pode criar uma conta nova em **Entrar → Criar conta** (senha com 8+ caracteres, letras e números). As senhas ficam apenas como hash com salt no mock.

Outros dados de teste:

| Item                        | Valores                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------ |
| Cupons                      | `KURIO10` (10%), `GENESIS5` (5%), `VERAO24` (expirado), qualquer outro é inválido    |
| Endereço de carteira válido | `0xab12ab12ab12ab12ab12ab12ab12ab12ab12ab12` (`0x` + 40 hex)                         |
| Código de indicação         | 4 a 12 letras/números. `INVALID` é recusado pela API (erro de validação do servidor) |
| Nome ENS                    | minúsculas, números e `-` (mín. 3), o sufixo `.eth` é fixo                           |

## Fluxos principais

1. **Catálogo** (`/`): busca (ícone de lupa no header), coleções, rede, faixa de preço, abas, ordenação e paginação. Tudo fica na URL e sobrevive a refresh e ao histórico.
2. **Detalhe** (`/nft/nft-1`): galeria, edição, quantidade, favoritos (exige login) e **COMPRAR**.
3. **Carrinho** (`/cart`): quantidades, remoção e cupom. Funciona como visitante; **ao entrar, os itens do visitante são mesclados ao carrinho do usuário**.
4. **Pagamento** (`/checkout`, exige login): dados do colecionador, carteira, revisão e envio. Um acesso deslogado abre o modal de login e, depois de entrar, retorna ao checkout.
5. **Pedido** (`/order/:id`): processando → confirmado (recibo em modal) ou recusado. Sobrevive a refresh.
6. **Conta** (exige login): `/profile` (dados, avatar, senha) e `/wallets` (carteira principal e secundária).

Rotas privadas: `/checkout`, `/order/:id`, `/profile`, `/wallets`. Sem sessão, o router redireciona para `/` com o modal de login (`?auth=login&next=...`).

## MSW: como a API simulada funciona

- `main.tsx` inicia o worker **antes** de carregar o `App` (o `socket.io-client` guarda o `WebSocket` global ao ser importado). Se o worker falhar, o erro aparece no console como `[mocks] falha ao iniciar o MSW`.
- O Service Worker é o arquivo `public/mockServiceWorker.js`. Se ele não existir ou estiver desatualizado, rode `npx msw init public/ --save`.
- Handlers em `src/mocks/`: catálogo, carrinho, pedidos, conta/sessão, favoritos, carteiras, controle de cenários e o servidor Socket.IO (`socket.ts`).
- **Os handlers rodam no contexto de cada aba.** O estado persiste no navegador:

| Dado                                  | Onde fica                                | Persiste no reload               |
| ------------------------------------- | ---------------------------------------- | -------------------------------- |
| Contas, sessões, favoritos, carteiras | `localStorage` (`kurio.mock.auth.v1`)    | Sim                              |
| Carrinhos (por usuário e visitante)   | `localStorage` (`kurio.mock.carts.v1`)   | Sim                              |
| Pedidos                               | `localStorage` (`kurio.mock.orders.v1`)  | Sim                              |
| Token de sessão                       | `localStorage` (`kurio.session.token`)   | Sim                              |
| Cenário ativo                         | `sessionStorage` (`kurio.mock.scenario`) | Na aba                           |
| Preços/estoque alterados nos testes   | memória                                  | Não (volta ao catálogo original) |

- **Sessão:** expira em 30 minutos. Uma sessão expirada abre o modal de login sem tirar o usuário da tela (no checkout, o formulário é preservado).
- **Pedidos:** nascem `pending` e viram `confirmed` (ou `declined`) em ~1,5 s. A criação é **idempotente** (cabeçalho `Idempotency-Key`): repetir a mesma tentativa devolve o mesmo pedido; mesma chave com conteúdo diferente gera conflito (409).
- **Valores em ETH** trafegam como strings decimais. Taxa de rede: 0,06% do valor com desconto, arredondada a 3 casas.

### Usando um backend real

Desligue os mocks e encaminhe `/api` e `/socket.io` para o servidor:

```bash
# .env.local
VITE_ENABLE_MOCKS=false
```

```ts
// vite.config.ts
server: {
  proxy: {
    "/api": "http://localhost:3000",
    "/socket.io": { target: "http://localhost:3000", ws: true },
  },
},
```

## Selecionar e resetar cenários

Cenários de falha e de rede se ativam por URL (ficam valendo na aba até `?mock=reset`) ou em tempo de execução pelo console:

```js
__kurio.scenario("slow"); // troca de cenário sem recarregar
__kurio.scenario("default"); // volta ao normal
```

| Cenário (`?mock=`)   | Efeito                                                               |
| -------------------- | -------------------------------------------------------------------- |
| `slow`               | Catálogo e detalhe levam 2,5 s (skeletons)                           |
| `nfts-error`         | Catálogo e detalhe respondem 500                                     |
| `nfts-empty`         | Catálogo vazio                                                       |
| `declined`           | Pagamento recusado                                                   |
| `timeout`            | O pedido é criado, mas a resposta chega depois do timeout do cliente |
| `slow-payment`       | O pedido leva 5 s para confirmar                                     |
| `wallet-rejected`    | A carteira recusa a conexão                                          |
| `favorite-fail`      | A mutation de favorito falha (rollback)                              |
| `reset` ou `default` | Limpa o cenário                                                      |

**Resetar tudo** (catálogo, carrinhos, pedidos, contas e favoritos voltam ao estado inicial): rode `__kurio.reset()` no console e recarregue a página. Alternativa manual: DevTools → Application → _Clear site data_.

## Reproduzindo os fluxos de falha

Use `__kurio` no console do navegador (só existe com os mocks ativos):

| Fluxo                                       | Como reproduzir                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| Preço alterado com item no carrinho         | `__kurio.setPrice("nft-2", "9.99")`                                             |
| Edição esgotada                             | `__kurio.setStock("nft-2", "1-50", 0)`                                          |
| Evento duplicado                            | `__kurio.replay("duplicate")`                                                   |
| Evento antigo (não regride o estado)        | `__kurio.replay("stale")`                                                       |
| Queda de conexão (ex.: com pedido pendente) | `__kurio.disconnect(5000)`                                                      |
| Sessão expirada                             | `__kurio.expireSession()` e depois qualquer ação privada (ex.: abrir Carteiras) |
| Conflito de cadastro                        | Criar conta com `ana@kurio.dev`                                                 |
| Cupom inválido / expirado                   | `FOO` / `VERAO24`                                                               |
| Erro de validação da API                    | Código de indicação `INVALID` no pagamento ou na carteira                       |
| Timeout com recuperação por idempotência    | `?mock=timeout`, enviar o pedido, aguardar o aviso e usar **Tentar novamente**  |
| Pagamento recusado                          | `?mock=declined`                                                                |

Exemplo de ponta a ponta do cenário de tempo real: logue como Ana, adicione `nft-2` ao carrinho, abra `/checkout`, preencha e clique **Confirmar compra**; então rode `__kurio.setPrice("nft-2", "9.99")`. A interface avisa, atualiza o resumo, fecha a revisão e exige nova confirmação.

## Testes (Playwright)

```bash
npx playwright install chromium   # uma vez
npm run test:e2e:update           # 1ª execução: gera as baselines visuais
npm run test:e2e                  # suíte completa
npm run test:e2e:report           # relatório HTML (traces das falhas em test-results/)
```

- A suíte sobe um build otimizado com mocks (`npm run e2e:serve`) e roda em Chromium, nos projetos `desktop` (1440 px) e `mobile` (390 px).
- Cada teste roda em um contexto novo, portanto com estado isolado.
- Os testes de tempo real passam pelo cliente Socket.IO (interceptado pelo MSW), e os de REST pelos handlers MSW.
- As baselines ficam em `e2e/__screenshots__/` e devem ser geradas no mesmo sistema operacional do CI.

## Estrutura

```
src/
  api/          clientes Axios + hooks do TanStack Query (nfts, cart, orders, auth, account)
  components/   componentes de interface; ui/ contém os componentes shadcn/ui adaptados ao tema
  lib/          sessão, cache privado, avisos em tempo real, idempotência, utilitários
  mocks/        MSW: handlers REST, servidor Socket.IO simulado, bancos persistidos, cenários
  pages/        telas (Home, NftDetail, Cart, Checkout, Order, Profile, Wallets)
  types/        contratos tipados (REST e eventos)
e2e/            testes Playwright e helpers
public/         mockServiceWorker.js e assets estáticos
```

## Deploy

O deploy recomendado é a Vercel (aceita também Netlify e Cloudflare Pages). Como é um SPA, o acesso direto e o refresh das rotas dependem do rewrite:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Os mocks ficam ligados por padrão no build, então a URL publicada funciona sem configuração extra (inclusive o tempo real). Verifique que `public/mockServiceWorker.js` está versionado.

## Solução de problemas

| Sintoma                                              | Causa provável                      | O que fazer                                                                           |
| ---------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------- |
| Skeleton infinito ou "Resposta inválida de /api/..." | MSW não iniciou                     | Veja o console, confira `public/mockServiceWorker.js` e recarregue com Ctrl+Shift+R   |
| `VITE_ENABLE_MOCKS` aparece como `undefined`         | `.env` salvo em UTF-16              | Recrie o arquivo pelo editor, em UTF-8, e reinicie o `npm run dev`                    |
| Sem avisos de tempo real                             | Socket não conectou                 | Verifique `document.documentElement.dataset.socket` no console (`connected` esperado) |
| Dados antigos depois de mudar o mock                 | Estado persistido no `localStorage` | `__kurio.reset()` e recarregue                                                        |
| Sessão "estranha" entre abas                         | Cada aba tem seus handlers          | Teste em uma única aba ou resete                                                      |

## Limitações

- O MSW simula só o transporte WebSocket, por isso o cliente usa `transports: ["websocket"]` (sem long-polling).
- Páginas editoriais, suporte, atividade, ofertas e downloads estão fora do escopo: seus links ficam desabilitados, assim como o login social e a recuperação de senha.
- Referências de transação e o link do explorador de blocos são simulados.
- Alterações de preço/estoque feitas pelo `__kurio` vivem em memória e voltam ao normal no reload.

## Documentação complementar

Contratos REST e eventos, política de sessão, estado do carrinho, estratégia de cache e reconciliação entre REST e Socket.IO ficam em `ARCHITECTURE.md`.
