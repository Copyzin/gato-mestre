# Gato Mestre

SaaS editorial de dicas de apostas esportivas (público BR, 18+). Monorepo com três pacotes:

```
gato-mestre/
├── backend/    # API Hono + ingestão de dados, roda no Cloudflare Workers
├── frontend/   # Next.js 15 (App Router) + Tailwind + shadcn/ui
└── shared/     # Tipos e schemas Zod compartilhados (contrato front ↔ back)
```

## Stack

| Camada     | Tecnologias                                                        |
| ---------- | ------------------------------------------------------------------ |
| Frontend   | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui → Cloudflare Workers (OpenNext) |
| Backend    | Hono, Cloudflare Workers, Cron Triggers                            |
| Banco      | PostgreSQL no Neon + Drizzle ORM (migrations versionadas)          |
| Dados      | **Odds-API.io** (calendário, placares, odds — espinha dorsal) · OddsPapi (casas BR, a integrar) |
| Validação  | Zod (mesma lib no front, back e shared)                            |
| Testes     | Vitest + PGlite (Postgres em memória, integração via HTTP)         |
| CI/CD      | GitHub Actions (typecheck + testes + build; deploy manual)         |

## Estado atual (onde paramos — ago/2026)

**O que já funciona, verificado com dados reais:**

- Site completo no visual do wireframe do Figma Make (neo-brutalismo editorial): home com feed de dicas, `/resultados` com placar real, age gate 18+, layout responsivo (sidebar desktop, bottom nav mobile).
- **Ingestão de dados reais** (Odds-API.io): 51 jogos reais ingeridos, sugestões automáticas de dica geradas por **probabilidade implícita das odds** (1xbet/22Bet), apuração automática de resultados pelo placar final.
- **Painel admin completo**: login JWT, fila de sugestões (revisar → ajustar odd → publicar), botão "Atualizar dados", CRUD de dicas/jogos/banners, apuração manual com segunda confirmação no override.
- **Testes e CI/CD**: 21 testes de integração verdes; pipeline no GitHub Actions rodando typecheck + testes + build a cada push.
- **Não está no ar ainda**: nada foi deployado — tudo roda local (`wrangler dev` + `next dev`).

**Descoberta importante:** o plano grátis da API-Sports só libera temporadas 2022–2024 (sem dados atuais). Ela sai do loop ao vivo e fica para backtesting futuro; a espinha dorsal é a Odds-API.io.

## Próximos passos (o norte)

1. **Deploy na Cloudflare** — backend via workflow manual (`.github/workflows/deploy.yml`) + `wrangler secret put` das chaves; frontend via adapter OpenNext (`@opennextjs/cloudflare`). Ver seção 11.
2. **OddsPapi** — comparar o melhor preço nas casas brasileiras (Betano, EstrelaBet, Pixbet, KTO) nos jogos com dica publicada (uso cirúrgico: 250 req/mês).
3. **Refinos conhecidos** — janela "hoje" em America/Sao_Paulo (hoje usa UTC); `DELETE /admin/matches` (jogo errado só sai via SQL); timestamp de atualização das odds na UI.
4. **Outros esportes** — basquete/MMA entram como providers no módulo de ingestão (porta já aberta por desenho).
5. **Premium (fase futura)** — login de usuários, dicas pagas com coins/assinatura. Schema já não bloqueia; nada disso existe no MVP.

## Pré-requisitos

- Node.js 20+
- Um banco PostgreSQL no [Neon](https://neon.tech) e a connection string dele
  (formato: `postgresql://usuario:senha@host.neon.tech/database?sslmode=require`)
- Chave da [Odds-API.io](https://odds-api.io) (grátis, 100 req/hora) — alimenta os dados ao vivo

## 1. Instalar dependências

```bash
cd shared && npm install    # necessário para a resolução de tipos do zod
cd ../backend && npm install
cd ../frontend && npm install
```

## 2. Configurar variáveis do backend

Edite `backend/.dev.vars` (template completo em `backend/.dev.vars.example`, com
o link de onde obter cada chave):

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require
JWT_SECRET=gere-uma-string-aleatoria-longa
ADMIN_EMAIL=admin@gatomestre.local
ADMIN_PASSWORD=senha-inicial-do-admin
ODDS_API_IO_KEY=sua-chave-odds-api-io
ODDSPAPI_API_KEY=sua-chave-oddspapi        # usada na fase 2 do roadmap
API_SPORTS_KEY=sua-chave-api-sports        # opcional: só backtesting histórico (2022–2024)
```

- `DATABASE_URL` — connection string do Neon (obrigatória).
- `JWT_SECRET` — assina os tokens de sessão do admin (obrigatório para o painel).
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — usados **só pelo seed** para criar o primeiro
  admin. Depois do seed, a senha pode ser removida do arquivo (o hash fica no banco).
- `ODDS_API_IO_KEY` — chave da espinha dorsal de dados (obrigatória para a ingestão).

> **Nunca** commite o `.dev.vars` com credenciais reais — ele já está no `.gitignore`.
> O mesmo arquivo serve tanto para o Wrangler (dev local) quanto para o drizzle-kit (migrations).

## 3. Rodar migrations

Dentro de `backend/`:

```bash
npm run generate   # gera o SQL a partir de src/db/schema.ts
npm run migrate    # aplica as migrations no banco Neon
```

## 4. Rodar o backend local

Dentro de `backend/`:

```bash
npm run dev        # equivale a: npx wrangler dev
```

A API sobe em **http://localhost:8787** (se a porta estiver ocupada, o Wrangler
sobe na 8788 — confira o output e ajuste `NEXT_PUBLIC_API_URL` no front).

> **Atenção:** não ative `compatibility_flags = ["nodejs_compat"]` no `wrangler.toml`.
> Com essa flag, o driver do Neon detecta um ambiente Node dentro do workerd e
> escolhe o transporte errado — a requisição ao banco trava ou falha com
> `internal error`. Sem a flag, o driver usa `fetch` (HTTP) e funciona.

Rotas públicas:

| Rota           | Descrição                                          |
| -------------- | -------------------------------------------------- |
| `GET /`        | Health check — testa a conexão com o Neon          |
| `GET /sports`  | Lista os esportes cadastrados                      |
| `GET /tips/today` | Dicas **publicadas** cujos jogos começam hoje (UTC), com jogo e esporte |
| `GET /tips/results` | Dicas de jogos encerrados (`finished`), com placar, mais recentes primeiro |
| `GET /banners` | Banners ativos                                     |

## 5. Rodar o frontend local

Dentro de `frontend/`:

```bash
npm run dev
```

O site sobe em **http://localhost:3000**. A URL da API está em
`frontend/.env.local` (`NEXT_PUBLIC_API_URL=http://localhost:8787`).

> **CORS:** o backend só aceita a origem `http://localhost:3000`. Se o Next subir
> em outra porta (3001…), as chamadas falham — libere a 3000 em vez de mudar o back.

## 6. Testar a conexão com o Neon

Com o backend rodando:

```bash
curl http://localhost:8787/
```

Resposta esperada:

```json
{ "service": "Gato Mestre API", "status": "ok", "database": "connected" }
```

## 7. Popular o banco (seed) — opcional

```bash
cd backend && npm run seed
```

Insere 20 esportes, jogos/dicas de exemplo e cria o primeiro admin a partir de
`ADMIN_EMAIL`/`ADMIN_PASSWORD`. Idempotente: se já houver dados, aborta sem
alterar nada. **Com a ingestão real funcionando, o seed só é necessário para
criar o admin e os esportes.**

## 8. Ingestão de dados reais

A coleta roda de duas formas:

- **Manual (dev):** botão "Atualizar dados" no painel, ou direto na API:
  ```bash
  curl -X POST http://localhost:8787/admin/ingest \
    -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
    -d '{"task":"all"}'   # all | fixtures | suggestions | settle
  ```
- **Automática (produção):** Cron Triggers no `wrangler.toml` — fixtures+sugestões
  2x/dia (6h07/14h07 BRT), apuração a cada 2h. Em dev, o Wrangler não dispara cron
  sozinho: use o gatilho manual ou `curl "http://localhost:8787/cdn-cgi/local/scheduled"`.

Fluxo: **fixtures** traz jogos reais (upsert por `externalId`) → **suggestions**
gera dicas `draft` com probabilidade implícita das odds → admin publica na fila →
**settle** apura green/red pelo placar final. Regras: drafts nunca aparecem no
site; ingestão é idempotente; apuração automática marca `settledBy='auto'` e o
override do admin marca `'admin'`.

## 9. Painel admin

Com os dois servidores no ar, acesse **http://localhost:3000/admin/login** e
entre com o `ADMIN_EMAIL`/`ADMIN_PASSWORD` do seed.

- Sessão via JWT (HS256, expira em 2h), senha com hash PBKDF2 (100k iterações).
- Login com rate limit: 5 tentativas a cada 5 minutos por IP.
- No painel: fila de sugestões (publicar/descartar), publicar dica manual,
  cadastrar jogo, marcar resultado (Green/Red/Void), excluir dica, "Atualizar dados".
- Ao marcar Green/Red/Void, o jogo é encerrado (`finished`) e a dica vai para
  `/resultados`. Correção de resultado já apurado pede segunda confirmação.

Endpoints admin (todos com `Authorization: Bearer <token>`):

| Rota | Descrição |
| --- | --- |
| `POST /auth/login` | Login admin → `{ token }` |
| `GET /admin/tips?status=draft\|published` · `GET /admin/matches` | Listagens do painel |
| `POST /admin/tips` · `PATCH/DELETE /admin/tips/:id` | CRUD de dicas (publicar exige odd) |
| `POST /admin/matches` · `PATCH /admin/matches/:id` | CRUD de jogos |
| `POST /admin/banners` · `PATCH/DELETE /admin/banners/:id` | CRUD de banners |
| `POST /admin/ingest` | Gatilho manual da ingestão |

## 10. Testes

Os testes do backend são de **integração**: exercitam a API pela interface HTTP
contra um Postgres real em memória ([PGlite](https://pglite.dev)), com as
migrations aplicadas — sem mocks de colaboradores internos. Não precisam de
Neon, Docker nem credenciais.

```bash
cd backend
npm test            # roda a suíte uma vez (Vitest)
npm run test:watch  # modo watch durante o desenvolvimento
npm run typecheck   # tsc --noEmit
```

Regra do projeto (ver `AGENTS.md`): **toda funcionalidade nova chega com o
teste correspondente**, em TDD — primeiro o teste do comportamento (red),
depois a implementação mínima (green), um comportamento por vez.

## 11. CI/CD e deploy (Cloudflare)

- `.github/workflows/ci.yml` — roda em todo push/PR: typecheck + testes do
  backend e build do frontend.
- `.github/workflows/deploy.yml` — deploy **manual** do backend na Cloudflare
  (aba Actions → *Run workflow*). Pré-requisitos uma única vez:
  1. Secrets no GitHub: `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`.
  2. Secrets de runtime no Worker (não ficam no GitHub):
     ```bash
     cd backend
     npx wrangler login          # autentica sua conta Cloudflare
     npx wrangler secret put DATABASE_URL
     npx wrangler secret put JWT_SECRET
     npx wrangler secret put ODDS_API_IO_KEY
     npx wrangler secret put ODDSPAPI_API_KEY
     ```
  3. Deploy local direto também funciona: `npx wrangler deploy`.
- **Frontend:** deploy via adapter OpenNext (`@opennextjs/cloudflare`) — a
  configurar na fase de deploy. O worker do frontend **precisa** de
  `nodejs_compat`; o do backend **não pode** ter (ver seção 4).

## 12. Ferramentas de agente (dev)

O projeto é desenvolvido com agentes de IA no loop. Setup usado:

- **Kimi Code CLI** — agente principal (`kimi`). Instalação e login:
  ```bash
  npm i -g @moonshot-ai/kimi-code   # ou o instalador oficial
  kimi login                        # fluxo device-code
  kimi                              # modo interativo; `kimi -p "…"` não-interativo
  ```
- **MCP servers** — Cloudflare (docs/deploy), GitHub, Playwright, Context7,
  configurados na CLI (ver `~/.kimi-code` ou equivalente).
- **Transitions Refine** ([transitions.dev](https://transitions.dev)) — painel
  para ajustar transitions/animations na página rodando. O relay fala com o
  agente via `REFINE_AGENT_CMD`; como o `kimi -p` não lê prompt do stdin, usamos
  um shim (ponte stdin → argumento). Setup (uma vez por máquina, já feito no Windows do time):
  ```powershell
  setx REFINE_AGENT_CMD "sh \"C:\caminho\para\refine-kimi-agent.sh\""
  ```
  Uso por projeto:
  ```bash
  npx transitions-refine stop       # só um relay por máquina (porta 7331)
  cd gato-mestre/frontend
  npx transitions-refine live       # painel injetado na página em dev
  ```
  No Next.js (sem `index.html`), a tag de injeção já está no `layout.tsx`,
  condicionada a `NODE_ENV === "development"`.
