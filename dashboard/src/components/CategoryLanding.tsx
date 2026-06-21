import { buildAuthPath } from "@/lib/authLinks";
import { folderPreviewMediaUrl, frontPageImageUrl } from "@/lib/datasetFolderCover";
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
  canManageDatasets: boolean;
  user: { role?: string; storageSlug?: string } | null | undefined;
  landingTopRef: React.RefObject<HTMLDivElement | null>;
  sectionAnchorRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  onNavigate: (path: string) => void;
  onUploadOpen: () => void;
  onLandingFilterSelect: (filterId: string) => void;
  onPathSearchFocus: () => void;
  onPathSearchChange: (value: string) => void;
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
  canManageDatasets,
  user,
  landingTopRef,
  sectionAnchorRefs,
  onNavigate,
  onUploadOpen,
  onLandingFilterSelect,
  onPathSearchFocus,
  onPathSearchChange,
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
      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-card shadow-[0_30px_70px_rgba(15,23,42,0.1)]">
        <section className="relative overflow-hidden border-b border-slate-200">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(13,148,136,0.06),transparent_52%),radial-gradient(ellipse_at_bottom_left,rgba(15,23,42,0.03),transparent_46%)]" />
          <div className="relative p-6 md:p-8">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="marketing-display-title text-[clamp(2rem,4vw,3.25rem)] font-black tracking-[-0.025em] text-slate-950">
                {landing.heroTitle}
              </h1>

              <div className="mx-auto mt-6 max-w-[760px]">
                <div className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                  Search {category.label.toLowerCase()} datasets
                </div>
                <CompactPathSearch
                  value={pathSearchText}
                  loading={pathSearchLoading}
                  suggestions={pathSuggestions}
                  placeholder={`Search ${category.label.toLowerCase()} datasets...`}
                  className="max-w-none"
                  onFocus={onPathSearchFocus}
                  onChange={onPathSearchChange}
                  onSuggestionClick={onPathSuggestionClick}
                  renderHighlightedPath={renderHighlightedPath}
                />
              </div>
            </div>

            <div className="mx-auto mt-8 grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-stretch">
              <div className="relative overflow-hidden rounded-[18px] border border-slate-300 shadow-[0_20px_48px_rgba(15,23,42,0.1)]">
                {heroVideoUrl ? (
                  <video
                    key={`${category.routeKey}-hero-video-${heroVideoUrl}`}
                    src={heroVideoUrl}
                    poster={heroPosterUrl}
                    aria-label={`${landing.heroTitle} hero`}
                    className="h-[300px] w-full object-cover"
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
                    className="h-[300px] w-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.12),transparent_45%,rgba(15,23,42,0.08))]" />
                <div className="absolute bottom-4 left-4 rounded-[10px] border border-slate-200 bg-card/90 px-3 py-2 backdrop-blur-sm">
                  <div className="text-[8px] font-black uppercase tracking-[0.18em] text-primary">
                    {landing.heroBadge}
                  </div>
                  <div className="mt-0.5 text-[12px] font-bold text-slate-950">{landing.heroTitle}</div>
                </div>
                <div className="absolute right-4 top-4 rounded-[8px] border border-slate-200 bg-card/90 px-3 py-1.5 text-[11px] font-semibold text-slate-500 backdrop-blur-sm">
                  <strong className="text-primary">{landing.heroPill}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                {heroStats.map((stat) => (
                  <div
                    key={`${landing.routeKey}-${stat.label}`}
                    className="flex min-h-[68px] flex-col justify-center rounded-[12px] border border-slate-200 bg-muted/60 px-4 py-3"
                  >
                    <div className="text-[20px] font-extrabold tracking-[-0.03em] text-slate-950">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="flex flex-col border-b border-slate-200 bg-card p-5 lg:border-b-0 lg:border-r lg:p-6">
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
              ) : canManageDatasets ? (
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
              ) : (
                <div className="rounded-xl border border-slate-200 bg-card px-4 py-3 text-center text-xs font-semibold leading-5 text-slate-500">
                  Public datasets are ready to browse.
                </div>
              )}
            </div>
          </aside>

          <div className="min-w-0 p-6 md:p-8">
            <div ref={landingTopRef} className="scroll-mt-32" />
            <div className="space-y-9">
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
                            ? onCategoryPreviewClick((entry.liveItem ?? entry.placeholderItem)!)
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
                    <h2 className="marketing-display-title text-[28px] font-black tracking-[-0.015em] text-slate-950">
                      {landing.ctaTitle}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {landing.ctaDescription}
                    </p>
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
                      className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-card px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-primary/20 hover:text-primary"
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
