# Design — Gato Mestre

<!-- Direção fixada pelo cliente em 11/08/2026: neo-brutalismo editorial do wireframe Figma Make
     (fonte extraída em ../wireframe-make/, versão 7). Substitui o antigo tema escuro zinc-950.
     Referências visuais: wireframe-make/shot-01..05 e resultados da implementação em
     wireframe-make/result-front-*.png. -->

## Contrato da direção

- **THESIS:** A dica é o produto, apresentada com voz editorial — "Menos palpite. Mais leitura de jogo." A home é um feed escaneável de análises publicadas pela equipe, com hero editorial e cards de leitura clara (mercado + odd).
- **OWN-WORLD:** neo-brutalismo editorial em tema claro — papel, tinta, amarelo e verde menta; bordas 2px sólidas, sombras duras, labels mono em caixa alta, sem border-radius (exceto logo/avatar circular).
- **STORY:** visitante passa pelo age gate uma vez, vê o hero "Dicas do dia", filtra por esporte na sidebar (desktop) ou nos chips (mobile), lê a dica clara com a odd e, quando houver casa parceira ativa, clica em "Apostar". A página /resultados sustenta a transparência editorial (dica ganha/perdida).
- **FIRST VIEWPORT:** header 72px (logo + tagline + nav + Entrar), hero menta com card "Radar mestre" amarelo à direita (desktop) e a lista de dicas começando logo abaixo.
- **FORM:** categoria jogada direto (lista de dicas + sidebar de esportes), edição brutalista-editorial — pinned pelo wireframe do cliente.

## Tokens

| Papel | Token Tailwind | Valor |
|---|---|---|
| tinta (bordas, texto, footer) | `ink` | `#1e2722` |
| amarelo destaque (CTA, seleção, logo) | `amarelo` | `#f2c94c` |
| verde menta (hero, dica ganha) | `menta` | `#c8e8d0` |
| vermelho claro (dica perdida) | `perdida` | `#f7c8c8` |
| papel (cards, header) | `papel` | `#f8f7f2` |
| areia (sidebar, faixas editoriais) | `areia` | `#ece9df` |
| fundo geral | `fundo` | `#f3f1eb` |
| cinzas secundários | `cinza-1` / `cinza-2` / `cinza-3` | `#6b706a` / `#5b625d` / `#a7a49a` |
| bordas | 2px sólidas `ink` |
| sombras | duras: `shadow-hard` 3px 3px 0 ink · `shadow-hard-lg` 7px 7px 0 ink · `shadow-hard-amarelo` 9px 9px 0 amarelo |
| radius | 0 (exceto logo/avatar: `rounded-full`) |
| fontes | IBM Plex Sans (texto, `--font-sans`) + DM Mono (labels/numerais, `--font-mono`), via `next/font/google` |
| textura | `.wire-noise` — grade fixa sutil sobre o fundo |

## Regras duráveis

1. **Bordas e sombras duras, não hairlines.** Separação por borda 2px `ink`; sombra só em deslocamento duro (cards, age gate, item ativo da sidebar).
2. **Labels em DM Mono caixa alta** com tracking largo; títulos em Plex Sans black com tracking negativo.
3. **Números tabulares** em qualquer odd, placar ou estatística.
4. **Card de dica = essencial apenas:** esporte+liga, confronto, horário, caixa "dica clara" (confiança, mercado, odd), assinatura "Publicada pelo Gato Mestre" e CTA "Apostar" quando houver casa parceira. Exceções decididas: selo de resultado (Green/Red/Anulada) quando o jogo terminou — transparência; probabilidade % e badge "Dica paga" do wireframe só entram quando a API fornecer o dado (hoje omitidos, não fabricar).
5. **Densidade de lista:** cards em coluna única, gap 12px, altura previsível para varredura rápida.
6. **Sidebar 245px (desktop):** Navegação + Esportes + aviso de jogo responsável; item ativo com preenchimento amarelo e sombra dura.
7. **Motion:** transições discretas (150ms); hover do card = leve translate + sombra dura maior; nenhuma animação de entrada no feed.
8. **Admin:** fora do escopo visual do wireframe — mantém a linguagem escura zinc própria, funcional e densa; formulários com labels visíveis, erros inline, confirmação para ações destrutivas.
9. **Acessibilidade:** contraste ≥ AA nos textos; foco visível em todos os controles; age gate navegável por teclado (focus trap) e overlay client-side (crawlers recebem o conteúdo).
10. **Responsivo:** abaixo de 1024px a sidebar vira chips horizontais de esporte (scroll sem scrollbar visível) e a navegação principal vai para a bottom nav fixa (Início, Dicas, Resultados, Perfil).
11. **Jogo responsável:** aviso "Apostas envolvem risco. Aposte com responsabilidade. +18" sempre presente — footer (faixa tinta) e sidebar.
