import Link from "next/link";
import type { Banner } from "@shared/index";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SportsSidebar } from "@/components/sports-sidebar";
import { TipCard } from "@/components/tip-card";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ esporte?: string }>;
};

function BannerStrip({ banner }: { banner: Banner }) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={banner.imageUrl}
      alt={banner.title}
      className="h-20 w-full rounded-lg border border-zinc-800 object-cover md:h-24"
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

  const heroBanner = banners?.find((b) => b.position === "hero") ?? null;
  const sidebarBanner = banners?.find((b) => b.position === "sidebar") ?? null;
  const betUrl = heroBanner?.linkUrl ?? null;
  const apiOffline = sports === null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <div className="mx-auto flex w-full max-w-7xl flex-1 px-4">
        <SportsSidebar sports={sportList} activeSlug={esporte} />

        <main className="min-w-0 flex-1 py-6 lg:pl-6">
          {/* Filtro por esporte — chips horizontais no mobile */}
          <div className="scrollbar-none mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            <FilterChip href="/" label="Todos" active={!esporte} />
            {sportList.map((sport) => (
              <FilterChip
                key={sport.id}
                href={`/?esporte=${sport.slug}`}
                label={`${sport.icon ?? ""} ${sport.name}`}
                active={esporte === sport.slug}
              />
            ))}
          </div>

          {heroBanner && (
            <div className="mb-6">
              <BannerStrip banner={heroBanner} />
            </div>
          )}

          <div className="mb-4 flex items-baseline justify-between">
            <h1 className="text-lg font-semibold tracking-tight">
              {activeSport ? `Dicas de ${activeSport.name}` : "Dicas de hoje"}
            </h1>
            <span className="text-xs tabular-nums text-zinc-500">
              {filteredTips.length}{" "}
              {filteredTips.length === 1 ? "dica" : "dicas"}
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
            <div className="flex flex-col gap-3">
              {filteredTips.map((tip) => (
                <TipCard key={tip.id} tip={tip} betUrl={betUrl} />
              ))}
            </div>
          )}

          {sidebarBanner && (
            <div className="mt-6">
              <BannerStrip banner={sidebarBanner} />
            </div>
          )}
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors duration-150",
        active
          ? "border-green-500 text-green-500"
          : "border-zinc-800 text-zinc-400 hover:text-zinc-50"
      )}
    >
      {label}
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
      {message}
    </div>
  );
}
