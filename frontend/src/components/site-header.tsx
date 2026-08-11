import Link from "next/link";

/**
 * Header público — 72px, papel, borda dura (wireframe Figma Make).
 * Server component: nav por âncoras da home + link para a área restrita.
 */
export function SiteHeader() {
  return (
    <header className="relative z-10 flex h-[72px] items-center justify-between border-b-2 border-ink bg-papel px-5 lg:px-8">
      <div className="flex items-center gap-8">
        <Link
          href="/"
          className="flex items-center gap-3 font-mono text-sm font-black uppercase"
        >
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-amarelo text-xl"
          >
            🐱
          </span>
          <span className="text-xl tracking-[-0.12em]">gato mestre</span>
        </Link>
        <span className="hidden border-l-2 border-ink pl-7 font-mono text-[10px] uppercase tracking-[0.16em] text-cinza-2 md:block">
          plataforma de análise esportiva
        </span>
      </div>
      <nav className="hidden items-center gap-6 text-sm font-bold lg:flex">
        <Link href="/#dicas">Dicas</Link>
        <Link href="/#como-funciona">Como funciona</Link>
        <Link href="/#quem-somos">Quem somos</Link>
      </nav>
      <Link
        href="/admin/login"
        className="border-2 border-ink bg-amarelo px-4 py-2 font-mono text-[11px] font-black uppercase tracking-wide"
      >
        Entrar
      </Link>
    </header>
  );
}
