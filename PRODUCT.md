# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Visitante (apostador brasileiro, 18+):** quer ver as dicas do dia em segundos e clicar no link da casa de aposta. Ação nº 1 confirmada: *ver a dica e clicar na casa*. Chega via Google (SEO de "dicas Time A x Time B") e redes sociais.
- **Admin (dono + 1-2 pessoas):** posta dicas categorizadas por esporte, marca resultados (green/red), gerencia banners de afiliado. Poucos logins, permissões iguais.

## Product Purpose

SaaS editorial de dicas de apostas esportivas. Publica dicas diárias por esporte com odd, mercado e nível de confiança, e monetiza via links de afiliado de casas de aposta. Sucesso = visitante encontra a dica e clica na casa em poucos segundos; recorrência diária.

## Positioning

Transparência verificável: taxa de acerto e ROI são computados de resultados reais no banco — nunca hardcoded. Sem hype, sem promessa de lucro; tom sóbrio e direto numa categoria dominada por gritaria visual.

## Operating Context

- Frontend Next.js 15 na Cloudflare Workers (via adapter OpenNext); backend Hono no Cloudflare Workers; banco PostgreSQL no Neon; imagens futuras no R2.
- `NEXT_PUBLIC_API_URL` é o único valor público no frontend; toda credencial vive no Worker.
- Conteúdo em pt-BR. Fuso de exibição: America/Sao_Paulo.

## Capabilities and Constraints

- v1: home com feed de dicas do dia, sidebar de ~20 esportes, age gate 18+, painel admin com login (JWT) para CRUD de dicas/jogos/banners.
- Card de dica mostra **só o essencial**: esporte, jogo, mercado, odd, confiança, horário.
- Obrigatório: age gate 18+ em overlay client-side (não bloqueia crawlers) + aviso fixo no footer. Lei 14.790/2023 e CONAR observadas; Termos de uso + LGPD pendentes.
- Futuro (não invalida arquitetura): premium/login de usuários, pagamento via Pix, loja afiliada, notificações.

## Brand Commitments

- Nome: **Gato Mestre**. Tema escuro zinc é compromisso do cliente.
- Direção visual fixada pelo cliente: **padrão da categoria executado com ofício** (referências: oddsagora.com.br, blaze.bet.br) — minimalista, objetivo, fácil de usar. Não inventar mundo visual exótico.

## Evidence on Hand

- `decisao-stack-gato-mestre.md` (decisões de arquitetura, v2 ago/2026).
- Screenshot da sidebar de referência (20 categorias de esporte, estilo lista com ícone + nome + chevron).
- Sem depoimentos, métricas ou histórico real ainda — não fabricar prova social.

## Product Principles

1. A dica é o produto: nada compete com odd + CTA na hierarquia visual.
2. Essencial apenas: se um elemento não ajuda a decidir/clicar, sai.
3. Escaneabilidade primeiro: lista densa, tipografia tabular para odds, agrupamento por esporte.
4. Confiança por sobriedade: sem neon, sem contadores falsos, sem urgência artificial.
5. Responsabilidade visível: 18+ e jogo responsável sempre presentes, nunca escondidos.
