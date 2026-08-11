# Design — Gato Mestre

<!-- Direção fixada pelo cliente: padrão da categoria (oddsagora / blaze) executado com ofício, edição minimalista. Modo da home: Persuade-enxuto (ver a dica → clicar na casa). Modo do admin: Operate. -->

## Contrato da direção

- **THESIS:** A dica é o produto. A home é um feed escaneável onde cada card leva ao clique na casa em segundos; recusamos o hero de marketing — o primeiro viewport já é a lista de dicas.
- **OWN-WORLD:** chão zinc-950, superfícies zinc-900, hairlines zinc-800, um único acento verde (cultura do "green" nas apostas), vermelho reservado a resultado perdido. Ícones de esporte em emoji (gramática da referência). Flat: sem gradientes, sem glow, sem sombras pesadas.
- **STORY:** visitante passa pelo age gate uma vez, vê "Dicas de hoje", filtra por esporte na sidebar, clica em "Apostar" → link da casa.
- **FIRST VIEWPORT:** top bar fina (logo + data + link admin), sidebar de esportes à esquerda (240px), coluna principal com o primeiro card de dica completo visível, odd em destaque e CTA verde.
- **FORM:** categoria padrão jogada direto (lista de dicas + sidebar de esportes), edição minimalista — pinned pelo brief, sem torneio de conceitos.

## Tokens

| Papel | Valor |
|---|---|
| background | `zinc-950` `#09090b` |
| surface (cards, sidebar) | `zinc-900` `#18181b` |
| border / hairline | `zinc-800` `#27272a` |
| text primary | `zinc-50` |
| text secondary | `zinc-400` |
| text faint | `zinc-500` |
| accent (odd, CTA, green) | `green-500` `#22c55e` |
| danger (red, erro, dica perdida) | `red-500` `#ef4444` |
| warning (18+, avisos) | `amber-500` `#f59e0b` |
| radius | `8px` cards / `6px` controles |
| font | Inter (next/font), `font-feature-settings: "tnum"` em odds/placares |

## Regras duráveis

1. **Um acento só.** Verde significa ação (CTA, odd, green). Nunca usar verde decorativo.
2. **Números tabulares** em qualquer odd, placar ou estatística.
3. **Hairlines, não sombras.** Separação por borda `zinc-800` de 1px; sombra só no age gate/overlay.
4. **Card de dica = essencial apenas:** ícone+nome do esporte, liga, times, mercado, horário, confiança (3 níveis: dot verde/amber/zinc), odd, CTA. Exceção decidida: badge de resultado (Green/Red) quando o jogo terminou — sustenta o posicionamento de transparência. Nada mais entra sem decisão explícita.
5. **Densidade de lista:** cards em coluna única no desktop do feed, gap 12px, padding 16px; altura previsível para varredura rápida.
6. **Sidebar:** item = emoji + nome em caps pequenas + chevron; ativo com hairline lateral verde, não preenchimento.
7. **Motion:** transições de cor/hover 150ms; nenhuma animação de entrada no feed (conteúdo visível por padrão).
8. **Admin:** mesma linguagem, mais densa; formulários com labels visíveis, estados de erro inline, confirmação para ações destrutivas.
9. **Acessibilidade:** contraste ≥ AA nos textos; foco visível em todos os controles; age gate navegável por teclado.
10. **Responsivo:** abaixo de 1024px a sidebar vira uma fileira de chips horizontais (scroll sem scrollbar visível) acima do feed — decisão registrada em substituição ao drawer, por ser mais enxuta e manter os esportes sempre visíveis; o feed ocupa a largura total no mobile.
