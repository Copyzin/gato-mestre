# AGENTS.md — Gato Mestre

Guia do agente de **produção do backend** — o mandante das requisições para o agente do frontend.
Leia este arquivo antes de qualquer tarefa. O agente do frontend tem um guia próprio, carregado
com skills de design e desenvolvimento front; este documento define o que o backend entrega,
como trabalha e como os dois agentes se comunicam.

---

## 1. Contexto do produto

SaaS editorial de dicas de apostas esportivas para o público brasileiro (18+). A dica é o
produto: o visitante entra, vê a dica do dia (jogo, mercado, odd, confiança) e clica no link
da casa de aposta. Monetização por afiliados. Transparência verificável: taxa de acerto e ROI
vêm de queries agregadas no banco — **nunca** hardcoded.

Documentos de referência (leia antes de decidir qualquer coisa):

| Documento | O que contém |
|---|---|
| `PRODUCT.md` | Propósito, usuários, princípios de produto, restrições regulatórias |
| `DESIGN.md` | Direção visual (referência para o agente do front) |
| `../decisao-stack-gato-mestre.md` | Arquitetura e decisões de stack (v3: 100% Cloudflare) |
| `../analise-apis-esportivas-apostas.md` | Estratégia das APIs de dados esportivos e odds |
| `../wireframe-make/` | Wireframe do Figma Make (telas, tokens, componentes) — referência funcional |

## 2. Arquitetura em um parágrafo

Monorepo com três pacotes: `backend/` (API Hono em Cloudflare Workers), `frontend/`
(Next.js 15 em Cloudflare Workers via adapter OpenNext) e `shared/` (tipos e schemas Zod
compartilhados — **o contrato entre front e back**). Banco PostgreSQL no Neon via Drizzle ORM.
Dados esportivos e odds vêm de APIs externas (API-Sports, Odds-API.io, OddsPapi) consumidas
**somente pelo backend**. Toda credencial vive no Worker do backend; o frontend só conhece
`NEXT_PUBLIC_API_URL`.

## 3. Regras de engenharia (não negociáveis)

Estas práticas vêm das skills de engenharia do Matt Pocock (`tdd`, `improve-codebase-architecture`,
`diagnose`). Siga-as em toda tarefa:

1. **TDD em fatias verticais.** Red → green → refactor, **um comportamento por vez**
   (test → impl → próximo). Nunca escreva todos os testes primeiro e toda a implementação
   depois ("horizontal slicing" produz testes que testam o formato das coisas, não o
   comportamento). O primeiro ciclo é o *tracer bullet*: prova o caminho end-to-end.
2. **Testes verificam comportamento pela interface pública**, nunca detalhes de
   implementação. Se um refactor interno quebra o teste sem mudar comportamento, o teste
   estava errado. Nada de mocks de colaboradores internos.
3. **Módulos profundos:** interface pequena, implementação profunda. Complexidade fica
   atrás de interfaces simples; não exponha costuras internas só porque um teste as usa.
4. **Bugs seguem o loop de diagnose:** reproduzir → minimizar → hipótese → instrumentar →
   corrigir → teste de regressão. Não corrija o que você não reproduziu.
5. **Mudança mínima que resolve a tarefa.** Sem refactor oportunista, sem reformatar arquivo
   alheio, sem abstração prematura. Três linhas parecidas são melhores que uma abstração errada.
6. **Verifique antes de declarar pronto:** rode os testes, o build ou o `curl` que cobre a
   sua mudança e olhe o resultado. "Deve funcionar" não é verificação.
7. **Zod valida tudo que entra e sai da API** (mesma lib nos dois lados). Tipos novos ou
   alterados entram primeiro em `shared/index.ts`.

## 4. Fluxo de trabalho do backend

```bash
cd backend
npm run dev        # wrangler dev → http://localhost:8787
npm run generate   # gera migration a partir de src/db/schema.ts
npm run migrate    # aplica migrations no Neon
npm run seed       # dados mockados (idempotente) + primeiro admin
```

- Health check: `GET /` → `{ "database": "connected" }`.
- **Nunca** ative `nodejs_compat` no `wrangler.toml` do backend — quebra o driver do Neon
  (ele escolhe o transporte errado no workerd). A flag só existe no worker do frontend
  (exigência do OpenNext).
- Schema novo → `generate` + `migrate`; nunca edite SQL de migration já aplicada.
- Deploy e secrets em produção: `npx wrangler secret put <NOME>`. A conta tem o **MCP server
  da Cloudflare ativo** — prefira as ferramentas MCP (e as skills `wrangler` / `cloudflare` /
  `workers-best-practices`) para deploy, observabilidade e configuração.

## 5. Integração das APIs esportivas

Conforme `../analise-apis-esportivas-apostas.md` (seção 8). Três camadas, três orçamentos:

| Camada | Fonte | Cota grátis | Uso |
|---|---|---|---|
| Calendário + stats + predictions | API-Sports (API-Football e irmãs) | 100 req/dia por esporte | Espinha dorsal: jogos, classificação, H2H, lesões, palpites |
| Odds pré-jogo do dia | Odds-API.io | 100 req/hora | Motor diário de odds (só 2 casas — referência de mercado) |
| Melhor preço em casas BR | OddsPapi | 250 req/mês | Uso cirúrgico: só jogos com dica publicada (Betano, EstrelaBet, Pixbet, KTO…) |

Regras da integração:

- **Cache é obrigatório.** Calendário e classificação: 1 coleta/dia, servidos do Postgres.
  Chamadas vivas só para odds, que expiram.
- **Coleta agendada via Cron Triggers** do Worker (nada de polling sob demanda do usuário).
- **Cruzar fontes pelo jogo** (time + data; a OddsPapi expõe IDs externos — Sofascore,
  Betradar — para ajudar no match).
- Odds exibidas sempre com timestamp de atualização ("odds atualizadas às 14h") — os planos
  grátis têm defasagem; nunca prometa tempo real.
- A Odds-API.io restringe o plano grátis a dev/teste/uso pessoal — risco contratual aceito
  e registrado; se o produto monetizar, essa camada migra primeiro.

## 6. Variáveis de ambiente e segredos

- Local: `backend/.dev.vars` (não commitado; template em `.dev.vars.example`). O mesmo
  arquivo serve Wrangler e drizzle-kit.
- Produção: `wrangler secret put` (via MCP da Cloudflare quando possível).
- **Nunca** commite segredo, nunca exponha segredo em log, resposta de API ou bundle do
  frontend. Variável de frontend começa com `NEXT_PUBLIC_` — e a única permitida é
  `NEXT_PUBLIC_API_URL`.

## 7. Contrato com o agente do frontend

O agente do backend é o **mandante**: ele define o que existe para consumir. O agente do
frontend nunca inventa dados nem endpoints.

1. **`shared/index.ts` é a única fonte da verdade dos tipos.** Endpoint novo ou alterado →
   schema Zod no `shared` primeiro, depois a rota, depois avisar o front.
2. Ao entregar ou mudar um endpoint, a requisição para o front deve conter: método + rota,
   schema de resposta (do `shared`), códigos de erro possíveis, e exemplo de payload real
   (obtido com `curl` contra o dev server — não inventado).
3. Mudança que quebra contrato (campo removido/renomeado) é comunicada **antes** do merge,
   com o diff do schema.
4. O front consome apenas rotas públicas (`/sports`, `/tips/today`, `/banners`, …) e as
   rotas `/admin/*` com JWT. Novas necessidades de dados do front viram requisição para
   este agente — nunca acesso direto ao banco.
5. SEO é requisito funcional: páginas de dicas precisam SSR/ISR; o age gate 18+ é overlay
   client-side e **não** pode bloquear crawler.
6. Referência funcional e visual para as telas: `../wireframe-make/` (extração do Figma
   Make) + `DESIGN.md`. Divergências de design são decididas pelo agente do front com as
   skills dele; divergências de **dados** são resolvidas aqui.

## 8. Definition of done (backend)

- [ ] Tipos atualizados em `shared/index.ts` (se o contrato mudou)
- [ ] Migration gerada e aplicada (se o schema mudou)
- [ ] Testes do comportamento novo passando (TDD, fatias verticais)
- [ ] `curl` contra o dev server confirmando a resposta real
- [ ] Requisição ao front atualizada (rota, schema, erros, exemplo real)
- [ ] Nenhum segredo em código, log ou commit
