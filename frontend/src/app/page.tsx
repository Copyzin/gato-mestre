import Link from "next/link";
import type { Banner, TipWithMatch } from "@shared/index";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SportsSidebar } from "@/components/sports-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { TipCard } from "@/components/tip-card";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ esporte?: string }>;
};

const TZ = "America/Sao_Paulo";

function todayLabel() {
  const now = new Date();
  const day = now.toLocaleDateString("pt-BR", { day: "2-digit", timeZone: TZ });
  const month = now
    .toLocaleDateString("pt-BR", { month: "short", timeZone: TZ })
    .replace(".", "");
  return `${day} ${month}`;
}

function timeNow() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

function countBySport(tips: TipWithMatch[]) {
  return tips.reduce<Record<string, number>>((acc, tip) => {
    acc[tip.sport.slug] = (acc[tip.sport.slug] ?? 0) + 1;
    return acc;
  }, {});
}

function BannerStrip({ banner }: { banner: Banner }) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={banner.imageUrl}
      alt={banner.title}
      className="h-24 w-full border-2 border-ink object-cover md:h-28"
    />
  );
  return banner.linkUrl ? (
    <a href={banner.linkUrl} target="_blank" rel="noopener sponsored">
      {img}
    </a>
  ) : (
    img
  );
}

export default async function Home({ searchParams }: Props) {
  const { esporte } = await searchParams;
  const [sports, tips, banners] = await Promise.all([
    api.getSports(),
    api.getTodayTips(),
    api.getBanners(),
  ]);

  const sportList = sports ?? [];
  const allTips = tips ?? [];
  const activeSport = sportList.find((s) => s.slug === esporte);
  const filteredTips = activeSport
    ? allTips.filter((t) => t.sport.slug === activeSport.slug)
    : allTips;
  const counts = countBySport(allTips);

  const heroBanner = banners?.find((b) => b.position === "hero") ?? null;
  const sidebarBanner = banners?.find((b) => b.position === "sidebar") ?? null;
  const betUrl = heroBanner?.linkUrl ?? null;
  const apiOffline = sports === null;
  const feedTitle = activeSport
    ? `Dicas de ${activeSport.name.toLowerCase()}`
    : "Dicas em destaque";

  return (
    <div className="min-h-screen bg-fundo text-ink">
      <div className="wire-noise" />
      <SiteHeader />

      <div className="relative z-10 pb-20 lg:grid lg:grid-cols-[245px_minmax(0,1fr)] lg:pb-0">
        <SportsSidebar
          sports={sportList}
          activeSlug={esporte}
          activeNav="inicio"
          counts={counts}
        />

        <main className="min-w-0">
          {/* Hero mobile — faixa menta */}
          <section className="border-b-2 border-ink bg-menta px-5 py-6 lg:hidden">
            <span className="inline-block border-2 border-ink bg-papel px-2 py-1 font-mono text-[9px] font-black uppercase tracking-[0.14em]">
              Dicas do dia · {todayLabel()}
            </span>
            <h1 className="mt-4 text-[2.25rem] font-black leading-[0.92] tracking-[-0.075em]">
              Leitura de jogo,
              <br />
              sem enrolação.
            </h1>
            <div className="mt-5 flex items-center justify-between border-t-2 border-ink pt-3">
              <span className="font-mono text-[10px] font-bold uppercase">
                {String(allTips.length).padStart(2, "0")} análises publicadas
              </span>
              <span aria-hidden className="text-xl">
                🐱
              </span>
            </div>
          </section>

          {/* Filtro por esporte — chips horizontais no mobile */}
          <section className="border-b-2 border-ink bg-papel px-5 py-4 lg:hidden">
            <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-cinza-1">
              Filtre por esporte
            </p>
            <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
              <SportChip href="/" icon="✦" label="Todos" active={!esporte} />
              {sportList.map((sport) => (
                <SportChip
                  key={sport.id}
                  href={`/?esporte=${sport.slug}`}
                  icon={sport.icon ?? "•"}
                  label={sport.name}
                  count={counts[sport.slug] ?? 0}
                  active={esporte === sport.slug}
                />
              ))}
            </div>
          </section>

          <div className="p-4 sm:p-6 lg:p-8">
            {/* Hero desktop */}
            <div className="mb-6 hidden overflow-hidden border-2 border-ink bg-menta md:grid md:grid-cols-[1.15fr_.85fr] lg:grid">
              <div className="p-6 md:p-8">
                <span className="inline-block border-2 border-ink bg-papel px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.15em]">
                  Dicas do dia · {todayLabel()}
                </span>
                <h1 className="mt-5 max-w-xl text-4xl font-black leading-[0.94] tracking-[-0.07em] md:text-5xl">
                  Menos palpite.
                  <br />
                  Mais leitura de jogo.
                </h1>
                <p className="mt-4 max-w-md text-sm leading-6">
                  Análises objetivas para você entender a partida antes de
                  montar a sua aposta.
                </p>
                <a
                  href="#dicas"
                  className="mt-6 inline-flex border-2 border-ink bg-ink px-4 py-3 font-mono text-[11px] font-black uppercase tracking-wide text-white"
                >
                  Ver dicas selecionadas →
                </a>
              </div>
              <div className="relative hidden border-l-2 border-ink bg-amarelo md:block">
                <div className="absolute inset-5 border-2 border-ink bg-papel p-5 shadow-hard-lg">
                  <p className="font-mono text-[10px] uppercase">Radar mestre</p>
                  <p aria-hidden className="mt-10 text-4xl">
                    ⚽
                  </p>
                  <p className="mt-3 text-lg font-black tracking-[-0.05em]">
                    {allTips.length}{" "}
                    {allTips.length === 1 ? "partida" : "partidas"}
                    <br />
                    {allTips.length === 1 ? "mapeada hoje" : "mapeadas hoje"}
                  </p>
                  <div className="mt-4 border-t-2 border-dashed border-ink pt-3 font-mono text-[10px] uppercase">
                    Atualizado {timeNow()}
                  </div>
                </div>
              </div>
            </div>

            {heroBanner && (
              <div className="mb-6">
                <BannerStrip banner={heroBanner} />
              </div>
            )}

            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-cinza-1">
                  Hoje em campo
                </p>
                <h2
                  id="dicas"
                  className="mt-1 text-2xl font-black tracking-[-0.06em]"
                >
                  {feedTitle}
                </h2>
              </div>
              <span className="font-mono text-[10px] font-bold uppercase">
                {filteredTips.length}{" "}
                {filteredTips.length === 1 ? "dica" : "dicas"} · hoje
              </span>
            </div>

            {apiOffline ? (
              <EmptyState message="Não foi possível carregar as dicas agora. Tente novamente em instantes." />
            ) : filteredTips.length === 0 ? (
              <EmptyState
                message={
                  activeSport
                    ? `Nenhuma dica de ${activeSport.name} hoje.`
                    : "Nenhuma dica publicada hoje ainda."
                }
              />
            ) : (
              <div className="space-y-3 lg:space-y-3">
                {filteredTips.map((tip, index) => (
                  <TipCard
                    key={tip.id}
                    tip={tip}
                    index={index}
                    betUrl={betUrl}
                  />
                ))}
              </div>
            )}

            {sidebarBanner && (
              <div className="mt-6">
                <BannerStrip banner={sidebarBanner} />
              </div>
            )}

            {/* Conteúdo editorial / Quem somos */}
            <div
              id="quem-somos"
              className="mt-7 border-2 border-ink bg-areia p-4 sm:flex sm:items-center sm:justify-between sm:gap-6"
            >
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
                  Conteúdo editorial
                </p>
                <p className="mt-1 text-sm font-bold">
                  As dicas são publicadas e atualizadas exclusivamente pela
                  equipe administradora.
                </p>
              </div>
              <span className="mt-3 inline-block border-2 border-ink bg-papel px-3 py-2 font-mono text-[10px] font-bold uppercase sm:mt-0">
                Dados via API
              </span>
            </div>

            <section
              id="como-funciona"
              className="mt-8 grid gap-3 border-t-2 border-ink pt-6 md:grid-cols-3"
            >
              <div>
                <p className="font-mono text-[10px] uppercase">01 · selecione</p>
                <p className="mt-2 font-bold">Encontre o jogo ou campeonato.</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase">02 · compare</p>
                <p className="mt-2 font-bold">
                  Leia contexto, dados e tendência.
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase">03 · decida</p>
                <p className="mt-2 font-bold">
                  Monte sua aposta com consciência.
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>

      <SiteFooter />
      <BottomNav />
    </div>
  );
}

function SportChip({
  href,
  icon,
  label,
  count,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  count?: number;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "shrink-0 border-2 border-ink px-3 py-2 text-left",
        active ? "bg-amarelo" : "bg-white"
      )}
    >
      <span aria-hidden className="block text-sm">
        {icon}
      </span>
      <span className="mt-1 block text-xs font-bold">{label}</span>
      {count !== undefined && (
        <span className="font-mono text-[9px] tabular-nums">
          {count} {count === 1 ? "dica" : "dicas"}
        </span>
      )}
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border-2 border-ink bg-papel p-8 text-center font-mono text-[11px] font-bold uppercase text-cinza-1">
      {message}
    </div>
  );
}
