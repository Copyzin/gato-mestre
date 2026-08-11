# Gato Mestre

SaaS de dicas de apostas esportivas. Monorepo com três pacotes:

```
gato-mestre/
├── backend/    # API Hono rodando no Cloudflare Workers (local via Wrangler)
├── frontend/   # Next.js 15 (App Router) + Tailwind + shadcn/ui
└── shared/     # Tipos e schemas Zod compartilhados
```

## Stack

| Camada   | Tecnologias                                                        |
| -------- | ------------------------------------------------------------------ |
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui                    |
| Backend  | Hono, Cloudflare Workers (Wrangler em modo local)                  |
| Banco    | PostgreSQL no Neon (nuvem, via connection string)                  |
| ORM      | Drizzle ORM + drizzle-kit                                          |
| Validação| Zod                                                                |

## Pré-requisitos

- Node.js 20+
- Um banco PostgreSQL no [Neon](https://neon.tech) e a connection string dele
  (formato: `postgresql://usuario:senha@host.neon.tech/database?sslmode=require`)

## 1. Instalar dependências

```bash
cd backend && npm install
cd ../frontend && npm install
```

## 2. Configurar variáveis do backend

Edite `backend/.dev.vars`:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require
JWT_SECRET=gere-uma-string-aleatoria-longa
ADMIN_EMAIL=admin@gatomestre.local
ADMIN_PASSWORD=senha-inicial-do-admin
```

- `DATABASE_URL` — connection string do Neon (obrigatória).
- `JWT_SECRET` — assina os tokens de sessão do admin (obrigatório para o painel).
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — usados **só pelo seed** para criar o primeiro
  admin. Depois do seed, a senha pode ser removida do arquivo (o hash fica no banco).

As chaves das APIs esportivas (`API_SPORTS_KEY`, `ODDS_API_IO_KEY`, `ODDSPAPI_API_KEY`
e a opcional `THE_ODDS_API_KEY`) também ficam no `.dev.vars` — o template completo, com
o link de onde obter cada chave, está em `backend/.dev.vars.example`. A estratégia de
uso de cada API está em `../analise-apis-esportivas-apostas.md`.

> **Nunca** commite o `.dev.vars` com credenciais reais — ele já está no `.gitignore`.
> O mesmo arquivo serve tanto para o Wrangler (dev local) quanto para o drizzle-kit (migrations).

## 3. Rodar migrations

Dentro de `backend/`:

```bash
# Gera o SQL a partir do schema (src/db/schema.ts)
npm run generate

# Aplica as migrations no banco Neon
npm run migrate
```

Alternativa rápida (sem arquivos de migration, aplica o schema direto):

```bash
npm run push
```

## 4. Rodar o backend local

Dentro de `backend/`:

```bash
npm run dev        # equivale a: npx wrangler dev
```

A API sobe em **http://localhost:8787**.

> **Atenção:** não ative `compatibility_flags = ["nodejs_compat"]` no `wrangler.toml`.
> Com essa flag, o driver do Neon detecta um ambiente Node dentro do workerd e
> escolhe o transporte errado — a requisição ao banco trava ou falha com
> `internal error`. Sem a flag, o driver usa `fetch` (HTTP) e funciona.

Rotas disponíveis:

| Rota           | Descrição                                          |
| -------------- | -------------------------------------------------- |
| `GET /`        | Health check — testa a conexão com o Neon          |
| `GET /sports`  | Lista os esportes cadastrados                      |
| `GET /tips/today` | Dicas cujos jogos começam hoje (UTC), com jogo e esporte |
| `GET /tips/results` | Dicas de jogos encerrados (`finished`), mais recentes primeiro — alimenta a tela `/resultados` |
| `GET /banners` | Banners ativos                                     |

## 5. Rodar o frontend local

Dentro de `frontend/`:

```bash
npm run dev
```

O site sobe em **http://localhost:3000**. A URL da API está em
`frontend/.env.local` (`NEXT_PUBLIC_API_URL=http://localhost:8787`).

## 6. Testar a conexão com o Neon

Com o backend rodando:

```bash
curl http://localhost:8787/
```

Resposta esperada (conexão OK):

```json
{ "service": "Gato Mestre API", "status": "ok", "database": "connected" }
```

Se aparecer `"database": "unreachable"`, confira a connection string em
`backend/.dev.vars`. Se aparecer erro de tabela inexistente
(`relation "sports" does not exist`), rode as migrations (passo 3).

## 7. Popular o banco com dados mockados (seed)

Dentro de `backend/`:

```bash
npm run seed
```

Insere 20 esportes (Futebol, Basquete, Tênis, Vôlei, MMA, Futebol Americano,
eSports, Boxe, Dardos, Vôlei de Praia, Hóquei, Beisebol, Tênis de Mesa, Sinuca,
Rugby League, Rugby, Futsal, Críquete, Badminton, Futebol Australiano),
15 jogos com dica para hoje e 2 banners de exemplo. Também cria o primeiro
usuário admin a partir de `ADMIN_EMAIL`/`ADMIN_PASSWORD` (ou gera uma senha
aleatória e a imprime uma única vez). O seed é idempotente: se já houver dados,
ele aborta sem alterar nada.

## 8. Painel admin

Com os dois servidores no ar, acesse **http://localhost:3000/admin/login** e
entre com o `ADMIN_EMAIL`/`ADMIN_PASSWORD` do seed.

- Sessão via JWT (HS256, expira em 2h), senha com hash PBKDF2 (100k iterações).
- Login com rate limit: 5 tentativas a cada 5 minutos por IP.
- Rotas `/admin/*` da API exigem `Authorization: Bearer <token>`.
- No painel: publicar dica, cadastrar jogo, marcar resultado (Green/Red/Void)
  e excluir dica (com confirmação).
- Ao marcar Green/Red/Void, o jogo é automaticamente encerrado
  (`status = finished`) e a dica passa a aparecer na tela pública `/resultados`
  (via `GET /tips/results`).

Endpoints da API:

| Rota | Descrição |
| --- | --- |
| `POST /auth/login` | Login admin → `{ token }` |
| `GET /admin/tips` · `GET /admin/matches` | Listagens do painel |
| `POST /admin/tips` · `PATCH/DELETE /admin/tips/:id` | CRUD de dicas |
| `POST /admin/matches` · `PATCH /admin/matches/:id` | CRUD de jogos |
| `POST /admin/banners` · `PATCH/DELETE /admin/banners/:id` | CRUD de banners |


## 9. Testes

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

## 10. CI/CD (GitHub Actions)

- `.github/workflows/ci.yml` — roda em todo push/PR: typecheck + testes do
  backend e build do frontend.
- `.github/workflows/deploy.yml` — deploy manual do backend na Cloudflare
  (gatilho *workflow_dispatch* na aba Actions). Pré-requisitos: secrets
  `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` no repositório. Os secrets
  de runtime (`DATABASE_URL`, `JWT_SECRET`, chaves das APIs esportivas) ficam
  no Worker via `npx wrangler secret put`, não no GitHub.
