import { buildAuthPath } from "@/lib/authLinks";
import type { CategoryKey, FolderItem, ResolvedCatalogCardEntry } from "@/lib/dataViewerTypes";
import { CATEGORIES, buildCategoryLandingPath, getCategoryAccent } from "@/lib/dataViewerUtils";
import { ROOT_SHOWCASE_SECTIONS } from "@/lib/roboDataHubCatalog";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CompactPathSearch } from "./CompactPathSearch";
import { RootShowcaseCatalogCard } from "./RootShowcaseCatalogCard";

interface RootShowcaseSection {
  routeKey: CategoryKey;
  title: string;
  dotClassName: string;
  lineClassName: string;
  cards: ResolvedCatalogCardEntry[];
}

interface RootLandingProps {
  viewerBasePath: string;
  isAuthenticated: boolean;
  isApproved: boolean;
  canManageDatasets: boolean;
  canImportDatasets: boolean;
  pathSearchText: string;
  pathSearchLoading: boolean;
  pathSuggestions: FolderItem[];
  rootResolvedShowcaseSections: RootShowcaseSection[];
  rootSectionRefs: React.MutableRefObject<Partial<Record<CategoryKey, HTMLElement | null>>>;
  onNavigate: (path: string) => void;
  onUploadOpen: () => void;
  onPathSearchFocus: () => void;
  onPathSearchChange: (value: string) => void;
  onPathSuggestionClick: (fullPath: string) => void;
  renderHighlightedPath: (fullPath: string) => ReactNode;
  onGuestSignIn: (path?: string) => void;
}

export function RootLanding({
  viewerBasePath,
  isAuthenticated,
  isApproved,
  canManageDatasets,
  canImportDatasets,
  pathSearchText,
  pathSearchLoading,
  pathSuggestions,
  rootResolvedShowcaseSections,
  rootSectionRefs,
  onNavigate,
  onUploadOpen,
  onPathSearchFocus,
  onPathSearchChange,
  onPathSuggestionClick,
  renderHighlightedPath,
  onGuestSignIn,
}: RootLandingProps) {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 md:py-14">
      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-card shadow-[0_30px_70px_rgba(15,23,42,0.1)]">
        <div className="grid lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="flex flex-col border-b border-slate-200 bg-card p-5 lg:border-b-0 lg:border-r lg:p-6">
            <div className="border-b border-slate-200 pb-5">
              <div className="text-lg font-extrabold tracking-[0.04em] text-primary">DataraAI</div>
              <div className="mt-1 text-base font-bold text-slate-950">Physical AI Data</div>
            </div>

            <div className="pt-4">
              <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Verticals
              </div>
              <div className="space-y-1.5">
                {ROOT_SHOWCASE_SECTIONS.map((section) => {
                  const category = CATEGORIES.find((item) => item.routeKey === section.routeKey);
                  if (!category) return null;

                  return (
                    <button
                      key={section.routeKey}
                      type="button"
                      onClick={() => {
                        const nextPath = buildCategoryLandingPath(category, viewerBasePath);
                        if (!isAuthenticated) {
                          onGuestSignIn(nextPath);
                          return;
                        }
                        onNavigate(nextPath);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-[3px] ${getCategoryAccent(category.routeKey).dot}`}
                      />
                      <span className="text-[14px] font-extrabold text-slate-950">{section.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              {isAuthenticated && isApproved && (canManageDatasets || canImportDatasets) ? (
                <div className="space-y-3">
                  {canManageDatasets && (
                    <button
                      type="button"
                      onClick={() => onNavigate(`${viewerBasePath}/my`)}
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      My private data
                    </button>
                  )}
                  {canImportDatasets && (
                    <button
                      type="button"
                      onClick={onUploadOpen}
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      Import data
                    </button>
                  )}
                </div>
              ) : !isAuthenticated || !isApproved ? (
                <Link
                  to={buildAuthPath("register", viewerBasePath)}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Get Access
                </Link>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-card px-4 py-3 text-center text-xs font-semibold leading-5 text-slate-500">
                  Public datasets are ready to browse.
                </div>
              )}
            </div>
          </aside>

          <div className="min-w-0 p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <h1 className="marketing-display-title text-[24px] font-extrabold tracking-[-0.005em] text-slate-950">
                  RoboDataHub
                </h1>
                <p className="mt-1 text-[13px] text-slate-500">
                  100+ datasets &middot; Physical AI training data
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <CompactPathSearch
                  value={isAuthenticated ? pathSearchText : ""}
                  loading={isAuthenticated ? pathSearchLoading : false}
                  suggestions={isAuthenticated ? pathSuggestions : []}
                  placeholder={isAuthenticated ? "Search datasets..." : "Sign in to search datasets"}
                  className="max-w-[760px]"
                  onFocus={() => {
                    if (!isAuthenticated) {
                      onGuestSignIn(viewerBasePath);
                      return;
                    }
                    onPathSearchFocus();
                  }}
                  onChange={(value) => {
                    if (!isAuthenticated) {
                      onGuestSignIn(viewerBasePath);
                      return;
                    }
                    onPathSearchChange(value);
                  }}
                  onSuggestionClick={onPathSuggestionClick}
                  renderHighlightedPath={renderHighlightedPath}
                />
              </div>
            </div>

            <div className="mt-8 space-y-9">
              {rootResolvedShowcaseSections.map((section) => {
                const category = CATEGORIES.find((item) => item.routeKey === section.routeKey);
                if (!category) return null;

                return (
                  <section
                    key={section.routeKey}
                    ref={(element) => {
                      rootSectionRefs.current[section.routeKey] = element;
                    }}
                    data-root-category-key={section.routeKey}
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <span className={`h-3 w-3 shrink-0 rounded-[3px] ${section.dotClassName}`} />
                      <span className="text-[16px] font-extrabold text-slate-950">{section.title}</span>
                      <div
                        className={`h-px flex-1 bg-gradient-to-r ${section.lineClassName} to-transparent`}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {section.cards.map((entry) => {
                        const previewItem = entry.liveItem ?? entry.placeholderItem ?? null;
                        return (
                          <RootShowcaseCatalogCard
                            key={`${section.routeKey}-${entry.card.title}-${previewItem?.full_path ?? entry.card.pathLabel}`}
                            card={entry.card}
                            liveItem={entry.liveItem}
                            placeholderItem={entry.placeholderItem}
                            onOpen={() => {
                              const nextPath = buildCategoryLandingPath(category, viewerBasePath);
                              if (!isAuthenticated) {
                                onGuestSignIn(nextPath);
                                return;
                              }
                              onNavigate(nextPath);
                            }}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              })}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
