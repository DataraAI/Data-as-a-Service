export function CategorySidebarSection({
  title,
  items,
  activeItemId,
  onSelect,
}: {
  title: string;
  items: { id: string; label: string; dotClassName: string; badge?: string }[];
  activeItemId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mb-5">
      <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </div>
      <div className="space-y-1.5">
        {items.map((item) => {
          const isActive = item.id === activeItemId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                isActive
                  ? "border-primary/20 bg-primary/6 text-primary"
                  : "border-transparent text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${item.dotClassName}`} />
              <span className="flex-1 text-[13px] font-semibold">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
