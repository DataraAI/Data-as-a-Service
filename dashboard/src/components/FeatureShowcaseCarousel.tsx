import { ChevronLeft, ChevronRight } from "lucide-react";
import { type KeyboardEvent, type ReactNode, type TouchEvent, useEffect, useId, useRef, useState } from "react";

type ShowcaseAccent = "teal" | "blue" | "violet" | "orange";

export type FeatureShowcaseItem = {
  id: string;
  label: string;
  shortLabel?: string;
  accent: ShowcaseAccent;
  content: ReactNode;
  tall?: number;
};

type FeatureShowcaseCarouselProps = {
  items: FeatureShowcaseItem[];
  initialItemId?: string;
  ariaLabel: string;
};

const ACTIVE_TAB_CLASSES: Record<ShowcaseAccent, string> = {
  teal: "border-teal-400 bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-[0_9px_24px_rgba(13,148,136,0.30)]",
  blue: "border-blue-500 bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-[0_9px_24px_rgba(37,99,235,0.28)]",
  violet: "border-violet-500 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-[0_9px_24px_rgba(124,58,237,0.28)]",
  orange: "border-orange-400 bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-[0_9px_24px_rgba(249,115,22,0.28)]",
};

const INACTIVE_TAB_CLASSES: Record<ShowcaseAccent, string> = {
  teal: "border-teal-200 bg-teal-50/80 text-teal-800 hover:border-teal-300 hover:bg-teal-100 dark:border-teal-900/70 dark:bg-teal-950/25 dark:text-teal-200 dark:hover:border-teal-800 dark:hover:bg-teal-950/45",
  blue: "border-blue-200 bg-blue-50/80 text-blue-800 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-900/70 dark:bg-blue-950/25 dark:text-blue-200 dark:hover:border-blue-800 dark:hover:bg-blue-950/45",
  violet: "border-violet-200 bg-violet-50/80 text-violet-800 hover:border-violet-300 hover:bg-violet-100 dark:border-violet-900/70 dark:bg-violet-950/25 dark:text-violet-200 dark:hover:border-violet-800 dark:hover:bg-violet-950/45",
  orange: "border-orange-200 bg-orange-50/80 text-orange-800 hover:border-orange-300 hover:bg-orange-100 dark:border-orange-900/70 dark:bg-orange-950/25 dark:text-orange-200 dark:hover:border-orange-800 dark:hover:bg-orange-950/45",
};

const CONTROL_CLASSES: Record<ShowcaseAccent, string> = {
  teal: "border-teal-200 bg-teal-50 text-teal-700 hover:border-teal-400 hover:bg-teal-100 dark:border-teal-900/70 dark:bg-teal-950/30 dark:text-teal-200 dark:hover:border-teal-700 dark:hover:bg-teal-950/55",
  blue: "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/55",
  violet: "border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-400 hover:bg-violet-100 dark:border-violet-900/70 dark:bg-violet-950/30 dark:text-violet-200 dark:hover:border-violet-700 dark:hover:bg-violet-950/55",
  orange: "border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-400 hover:bg-orange-100 dark:border-orange-900/70 dark:bg-orange-950/30 dark:text-orange-200 dark:hover:border-orange-700 dark:hover:bg-orange-950/55",
};

const COUNT_CLASSES: Record<ShowcaseAccent, string> = {
  teal: "text-teal-600 dark:text-teal-300",
  blue: "text-blue-600 dark:text-blue-300",
  violet: "text-violet-600 dark:text-violet-300",
  orange: "text-orange-600 dark:text-orange-300",
};

const DOT_CLASSES: Record<ShowcaseAccent, string> = {
  teal: "bg-teal-600",
  blue: "bg-blue-700",
  violet: "bg-violet-600",
  orange: "bg-orange-600",
};

const SIDE_ARROW_CLASSES =
  "absolute top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border shadow-[0_10px_28px_rgba(15,23,42,0.16)] transition-all md:grid";

const PANEL_SLIDE_CLASSES = {
  forward: "motion-safe:slide-in-from-right-4",
  backward: "motion-safe:slide-in-from-left-4",
} satisfies Record<"forward" | "backward", string>;

export default function FeatureShowcaseCarousel({
  items,
  initialItemId,
  ariaLabel,
}: FeatureShowcaseCarouselProps) {
  const initialIndex = Math.max(
    0,
    initialItemId ? items.findIndex((item) => item.id === initialItemId) : 0,
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const carouselId = useId().replace(/:/g, "");
  const touchStartX = useRef<number | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabListRef = useRef<HTMLDivElement | null>(null);
  const panelViewportRef = useRef<HTMLDivElement | null>(null);
  const hasMounted = useRef(false);
  const activeItem = items[activeIndex];

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    if (panelViewportRef.current) {
      panelViewportRef.current.scrollTop = 0;
    }
    const activeTab = tabRefs.current[activeIndex];
    if (document.activeElement?.getAttribute("role") === "tab") {
      activeTab?.focus({ preventScroll: true });
    }
    const tabList = tabListRef.current;
    if (!activeTab || !tabList) return;
    const tabLeft = activeTab.offsetLeft;
    const tabRight = tabLeft + activeTab.offsetWidth;
    const visibleLeft = tabList.scrollLeft;
    const visibleRight = visibleLeft + tabList.clientWidth;

    if (tabLeft < visibleLeft || tabRight > visibleRight) {
      tabList.scrollTo({
        left: Math.max(0, tabLeft - (tabList.clientWidth - activeTab.offsetWidth) / 2),
        behavior: "smooth",
      });
    }
  }, [activeIndex]);

  if (!activeItem) return null;

  const selectItem = (nextIndex: number, nextDirection?: "forward" | "backward") => {
    if (nextIndex === activeIndex) return;
    setDirection(nextDirection ?? (nextIndex > activeIndex ? "forward" : "backward"));
    setActiveIndex(nextIndex);
  };

  const showPrevious = () => {
    selectItem((activeIndex - 1 + items.length) % items.length, "backward");
  };

  const showNext = () => {
    selectItem((activeIndex + 1) % items.length, "forward");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target !== event.currentTarget && target.getAttribute("role") !== "tab") return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPrevious();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showNext();
    } else if (event.key === "Home") {
      event.preventDefault();
      selectItem(0, "backward");
    } else if (event.key === "End") {
      event.preventDefault();
      selectItem(items.length - 1, "forward");
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const startX = touchStartX.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (startX === null || endX === undefined) return;

    const distance = endX - startX;
    if (Math.abs(distance) < 50) return;
    if (distance > 0) showPrevious();
    else showNext();
  };

  const carouselControls = (
    <div className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-card p-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:border-slate-700">
      <div
        ref={tabListRef}
        role="tablist"
        aria-label={`${ariaLabel} features`}
        className="custom-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 sm:pb-0"
      >
        {items.map((item, index) => {
          const selected = index === activeIndex;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              id={`${carouselId}-${item.id}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${carouselId}-${item.id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectItem(index)}
              className={`group inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[12px] font-extrabold transition-all duration-200 ${
                selected
                  ? ACTIVE_TAB_CLASSES[item.accent]
                  : INACTIVE_TAB_CLASSES[item.accent]
              }`}
            >
              <span
                className={`h-2 w-2 rounded-[2px] transition-all ${
                  selected
                    ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.85)]"
                    : `${DOT_CLASSES[item.accent]} opacity-60 group-hover:opacity-100`
                }`}
              />
              <span className="sm:hidden">{item.shortLabel ?? item.label}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 border-l border-slate-200 pl-3 dark:border-slate-700">
        <span className={`mr-1 hidden min-w-10 text-center font-mono-tech text-[10px] font-bold tracking-[0.08em] sm:inline ${COUNT_CLASSES[activeItem.accent]}`}>
          {activeIndex + 1} / {items.length}
        </span>
        <button
          type="button"
          onClick={showPrevious}
          aria-label="Show previous feature"
          className={`grid h-9 w-9 place-items-center rounded-full border transition-all ${CONTROL_CLASSES[activeItem.accent]}`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={showNext}
          aria-label="Show next feature"
          className={`grid h-9 w-9 place-items-center rounded-full border transition-all ${CONTROL_CLASSES[activeItem.accent]}`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <section
      aria-label={ariaLabel}
      className="space-y-4 rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {carouselControls}

      <div
        className="relative touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          type="button"
          onClick={showPrevious}
          aria-label="Show previous feature"
          className={`left-2 ${SIDE_ARROW_CLASSES} ${CONTROL_CLASSES[activeItem.accent]}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div
          ref={panelViewportRef}
          className={`custom-scrollbar overflow-y-auto overscroll-contain transition-[height] duration-300 ${activeItem.tall ? `h-[${activeItem.tall}rem]` : "h-[34rem]"}`}
        >
          <div
            key={activeItem.id}
            id={`${carouselId}-${activeItem.id}-panel`}
            role="tabpanel"
            aria-labelledby={`${carouselId}-${activeItem.id}-tab`}
            className={`min-h-full motion-safe:animate-in motion-safe:duration-200 motion-safe:ease-out [&>*]:min-h-full ${PANEL_SLIDE_CLASSES[direction]}`}
          >
            {activeItem.content}
          </div>
        </div>
        <button
          type="button"
          onClick={showNext}
          aria-label="Show next feature"
          className={`right-2 ${SIDE_ARROW_CLASSES} ${CONTROL_CLASSES[activeItem.accent]}`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 sm:hidden" aria-hidden="true">
        {items.map((item, index) => (
          <span
            key={item.id}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              index === activeIndex ? `w-6 ${DOT_CLASSES[activeItem.accent]}` : "w-1.5 bg-slate-300 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
