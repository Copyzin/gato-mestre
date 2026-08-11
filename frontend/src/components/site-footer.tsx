/**
 * Footer público — faixa tinta com aviso de jogo responsável (wireframe).
 */
export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t-2 border-ink bg-ink px-5 py-3 text-center font-mono text-[10px] text-papel">
      <p>18+ · APOSTAS ENVOLVEM RISCO. APOSTE COM RESPONSABILIDADE.</p>
      <p className="mt-1 text-[9px] text-papel/60">
        © {new Date().getFullYear()} Gato Mestre · Conteúdo editorial, sem
        garantia de resultados.
      </p>
    </footer>
  );
}
