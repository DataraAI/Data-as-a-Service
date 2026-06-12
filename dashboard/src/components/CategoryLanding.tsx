import { buildAuthPath } from "@/lib/authLinks";
import { folderPreviewMediaUrl } from "@/lib/datasetFolderCover";
import { frontPageImageUrl } from "@/lib/datasetFolderCover";
import type {
  CategoryConfig,
  CategoryDatasetPreview,
  CategoryKey,
  FolderItem,
  ResolvedCatalogSection,
} from "@/lib/dataViewerTypes";
import {
  CATEGORIES,
  buildCategoryLandingPath,
  canonicalizeDatasetPathForRoute,
  getCategoryAccent,
  getPreviewDatasetRootFromVideoBlobPath,
  normalizePathSearchValue,
  resolvePreviewMediaUrl,
} from "@/lib/dataViewerUtils";
import type { CategoryLandingContent } from "@/lib/roboDataHubCatalog";
import { Shield } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CategorySidebarSection } from "./CategorySidebarSection";
import { CompactPathSearch } from "./CompactPathSearch";
import { CuratedCatalogCard } from "./CuratedCatalogCard";

interface CategoryLandingProps {
  category: CategoryConfig;
  landing: CategoryLandingContent;
  viewerBasePath: string;
  localCategoryPreviewPlaceholdersByRoute: Record<CategoryKey, CategoryDatasetPreview[]>;
  activeLandingFilterId: string;
  resolvedCategorySections: ResolvedCatalogSection[];
  pathSearchText: string;
  pathSearchLoading: boolean;
  pathSuggestions: FolderItem[];
  isAuthenticated: boolean;
  isApproved: boolean;
  user: { role?: string; storageSlug?: string } | null | undefined;
  landingTopRef: React.RefObject<HTMLDivElement | null>;
  sectionAnchorRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  onNavigate: (path: string) => void;
  onUploadOpen: () => void;
  onLandingFilterSelect: (filterId: string) => void;
  onPathSearchFocus: () => void;
  onPathSearchChange: (value: string) => void;
  onPathSearchSubmit: () => void;
  onPathSuggestionClick: (fullPath: string) => void;
  renderHighlightedPath: (fullPath: string) => ReactNode;
  onCategoryPreviewClick: (item: CategoryDatasetPreview) => void;
  onCuratedCardOpen: (pathLabel: string, category?: CategoryConfig | null) => void;
}

export function CategoryLanding({
  category,
  landing,
  viewerBasePath,
  localCategoryPreviewPlaceholdersByRoute,
  activeLandingFilterId,
  resolvedCategorySections,
  pathSearchText,
  pathSearchLoading,
  pathSuggestions,
  isAuthenticated,
  isApproved,
  user,
  landingTopRef,
  sectionAnchorRefs,
  onNavigate,
  onUploadOpen,
  onLandingFilterSelect,
  onPathSearchFocus,
  onPathSearchChange,
  onPathSearchSubmit,
  onPathSuggestionClick,
  renderHighlightedPath,
  onCategoryPreviewClick,
  onCuratedCardOpen,
}: CategoryLandingProps) {
  const heroStats = landing.stats.slice(0, 4);
  const heroPreviewDatasetRoot = getPreviewDatasetRootFromVideoBlobPath(landing.heroVideoBlobPath);
  const heroPlaceholderItem =
    heroPreviewDatasetRoot
      ? (localCategoryPreviewPlaceholdersByRoute[category.routeKey] ?? []).find(
          (item) =>
            normalizePathSearchValue(item.full_path) ===
            normalizePathSearchValue(
              canonicalizeDatasetPathForRoute(heroPreviewDatasetRoot, category.routeKey),
            ),
        ) ?? null
      : null;
  const heroPosterUrl =
    (heroPlaceholderItem?.main_image ? resolvePreviewMediaUrl(heroPlaceholderItem.main_image) : null) ??
    frontPageImageUrl(landing.heroImagePath) ??
    undefined;
  const heroVideoUrl = landing.heroVideoBlobPath
    ? folderPreviewMediaUrl(landing.heroVideoBlobPath)
    : null;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 md:py-14">
      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.1)]">
        <section className="relative overflow-hidden border-b border-slate-200">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(13,148,136,0.06),transparent_52%),radial-gradient(ellipse_at_bottom_left,rgba(15,23,42,0.03),transparent_46%)]" />
          <div className="relative grid gap-10 p-6 md:p-8 lg:grid-cols-2 lg:items-center">
            <div>
              <div
                className={`mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${getCategoryAccent(category.routeKey).chip}`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${getCategoryAccent(category.routeKey).dot}`}
                />
                {landing.heroEyebrow}
              </div>
              <h1 className="text-[clamp(2.4rem,4.8vw,4.5rem)] font-black tracking-[-0.06em] text-slate-950">
                {landing.heroTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-8 text-slate-600 md:text-base">
                {landing.heroDescription}
              </p>

              <div className="mt-8 grid gap-px overflow-hidden rounded-[14px] border border-slate-300 bg-slate-200 sm:grid-cols-4">
                {heroStats.map((stat) => (
                  <div key={`${landing.routeKey}-${stat.label}`} className="bg-slate-50 px-4 py-4">
                    <div className="text-[22px] font-extrabold tracking-[-0.03em] text-slate-950">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[20px] border border-slate-300 shadow-[0_28px_64px_rgba(15,23,42,0.12)]">
              {heroVideoUrl ? (
                <video
                  key={`${category.routeKey}-hero-video-${heroVideoUrl}`}
                  src={heroVideoUrl}
                  poster={heroPosterUrl}
                  aria-label={`${landing.heroTitle} hero`}
                  className="h-[390px] w-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img
                  key={`${category.routeKey}-hero-image-${heroPosterUrl ?? "fallback"}`}
                  src={heroPosterUrl}
                  alt={`${landing.heroTitle} hero`}
                  className="h-[390px] w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.15),transparent_45%,rgba(15,23,42,0.06))]" />
              <div className="absolute bottom-5 left-5 rounded-[12px] border border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-sm">
                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-primary">
                  {landing.heroBadge}
                </div>
                <div className="mt-1 text-[13px] font-bold text-slate-950">{landing.heroTitle}</div>
              </div>
              <div className="absolute right-4 top-4 rounded-[8px] border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-500 backdrop-blur-sm">
                <strong className="text-primary">{landing.heroPill}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 md:px-8">
          <div className="grid gap-px overflow-hidden rounded-[16px] border border-slate-300 bg-slate-200 md:grid-cols-5">
            {landing.stats.map((stat) => (
              <div key={`${landing.routeKey}-band-${stat.label}`} className="bg-slate-50 px-5 py-4">
                <div className="text-[26px] font-black tracking-[-0.04em] text-slate-950">
                  {stat.value}
                </div>
                <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="flex flex-col border-b border-slate-200 bg-slate-50/90 p-5 lg:border-b-0 lg:border-r lg:p-6">
            <CategorySidebarSection
              title="Verticals"
              items={CATEGORIES.map((item) => ({
                id: item.routeKey,
                label: item.label,
                dotClassName: getCategoryAccent(item.routeKey).dot,
              }))}
              activeItemId={category.routeKey}
              onSelect={(routeKey) => {
                const nextCategory = CATEGORIES.find((item) => item.routeKey === routeKey);
                if (nextCategory) {
                  onNavigate(buildCategoryLandingPath(nextCategory, viewerBasePath));
                }
              }}
            />

            <CategorySidebarSection
              title="Filters"
              items={landing.filters}
              activeItemId={activeLandingFilterId}
              onSelect={onLandingFilterSelect}
            />

            <div className="mt-5 border-t border-slate-200 pt-4">
              {!isAuthenticated || !isApproved ? (
                <Link
                  to={buildAuthPath("register", viewerBasePath)}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Get Access
                </Link>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => onNavigate(`${viewerBasePath}/my`)}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    My private data
                  </button>
                  <button
                    type="button"
                    onClick={onUploadOpen}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Import data
                  </button>
                  {user?.role === "admin" ? (
                    <button
                      type="button"
                      onClick={() => onNavigate(`${viewerBasePath}/admin/${user.storageSlug}`)}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/8 px-4 text-sm font-bold text-primary transition-colors hover:bg-primary/12"
                    >
                      Admin access
                      <Shield className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </aside>

          <div className="min-w-0 p-6 md:p-8">
            <div ref={landingTopRef} className="scroll-mt-32" />
            <div className="space-y-9">
              <section className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="max-w-2xl">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Search library
                    </div>
                    <h2 className="mt-2 text-[18px] font-extrabold tracking-[-0.03em] text-slate-950">
                      Search real {category.label.toLowerCase()} datasets
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Search by dataset, task, or brand and jump straight into the live folder
                      structure.
                    </p>
                  </div>
                  <CompactPathSearch
                    value={pathSearchText}
                    loading={pathSearchLoading}
                    suggestions={pathSuggestions}
                    placeholder={`Search ${category.label.toLowerCase()} datasets...`}
                    submitDisabled={pathSuggestions.length === 0}
                    className="max-w-none xl:w-[640px]"
                    onFocus={onPathSearchFocus}
                    onChange={onPathSearchChange}
                    onSubmit={onPathSearchSubmit}
                    onSuggestionClick={onPathSuggestionClick}
                    renderHighlightedPath={renderHighlightedPath}
                  />
                </div>
              </section>

              {resolvedCategorySections.map((section) => (
                <section
                  key={`${landing.routeKey}-${section.id}`}
                  ref={(node) => {
                    sectionAnchorRefs.current[section.id] = node;
                  }}
                  className="scroll-mt-32"
                >
                  <div className="mb-4 flex items-center gap-3 border-l-[3px] border-primary pl-3">
                    <span className="text-[15px] font-extrabold text-slate-950">{section.title}</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                    <span className="text-[11px] font-semibold text-slate-400">
                      {section.countLabel}
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {section.cards.map((entry) => (
                      <CuratedCatalogCard
                        key={`${section.id}-${entry.card.title}-${entry.liveItem?.full_path ?? entry.placeholderItem?.full_path ?? "marketing"}`}
                        card={entry.card}
                        liveItem={entry.liveItem}
                        placeholderItem={entry.placeholderItem}
                        columns={2}
                        buttonLabel={
                          entry.liveItem || entry.placeholderItem
                            ? "Enter dataset"
                            : "Explore dataset"
                        }
                        onOpen={() =>
                          entry.liveItem || entry.placeholderItem
                            ? onCategoryPreviewClick(
                                (entry.liveItem ?? entry.placeholderItem)!,
                              )
                            : onCuratedCardOpen(entry.card.pathLabel, category)
                        }
                      />
                    ))}
                  </div>
                </section>
              ))}

              <section className="rounded-[20px] border border-primary/15 bg-[linear-gradient(128deg,rgba(13,148,136,0.05),rgba(15,23,42,0.02)_55%,transparent)] p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-3xl">
                    <h2 className="text-[28px] font-black tracking-[-0.04em] text-slate-950">
                      {landing.ctaTitle}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{landing.ctaDescription}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      to={buildAuthPath("register", viewerBasePath)}
                      className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      Request access
                    </Link>
                    <button
                      type="button"
                      onClick={() => onNavigate(viewerBasePath)}
                      className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-primary/20 hover:text-primary"
                    >
                      Back to RoboDataHub
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
