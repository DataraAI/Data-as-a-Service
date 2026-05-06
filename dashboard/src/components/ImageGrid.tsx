import { useEffect, useRef, useState } from "react";
import { Maximize2, Box, Film } from "lucide-react";

interface ImageGridProps {
  images: any[];
  onImageClick: (image: any) => void;
  visibleTags: Set<string>;
  visiblePrimitives: Set<string>;
}

export function ImageGrid({
  images,
  onImageClick,
  visibleTags,
  visiblePrimitives,
}: ImageGridProps) {
  const [displayedImages, setDisplayedImages] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const itemsPerPage = 50;
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDisplayedImages(images.slice(0, itemsPerPage));
    setPage(1);
  }, [images]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((previous) => previous + 1);
        }
      },
      { threshold: 1.0 },
    );

    const target = observerTarget.current;
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, []);

  useEffect(() => {
    if (page > 1) {
      setDisplayedImages((previous) => [
        ...previous,
        ...images.slice((page - 1) * itemsPerPage, page * itemsPerPage),
      ]);
    }
  }, [page, images]);

  return (
    <div className="custom-scrollbar h-full flex-1 overflow-y-auto bg-transparent p-4">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {displayedImages.map((img) => (
          <div
            key={img.asset_id ?? img.id}
            className="group relative cursor-pointer overflow-hidden rounded-sm border border-border bg-card/10 backdrop-blur-[5px] transition-all duration-300 hover:border-primary hover:shadow-elegant"
            onClick={() => onImageClick(img)}
          >
            {img.type === "3d" ? (
              <div className="flex h-48 w-full flex-col items-center justify-center bg-card/50 text-muted-foreground transition-colors group-hover:text-primary md:h-64">
                <Box className="mb-2 h-12 w-12" />
                <span className="font-sans-tech text-xs uppercase tracking-wider">3D Model</span>
              </div>
            ) : img.type === "video" ? (
              <div className="relative">
                <video
                  src={img.proxy_url || img.url}
                  preload="metadata"
                  muted
                  playsInline
                  className="h-auto w-full bg-black/20 object-contain"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="rounded-sm border border-primary/30 bg-background/80 px-3 py-2 text-primary shadow-lg">
                    <Film className="mx-auto mb-1 h-5 w-5" />
                    <span className="font-sans-tech text-[10px] uppercase tracking-wider">Video</span>
                  </div>
                </div>
              </div>
            ) : (
              <img
                src={img.proxy_url || img.url}
                alt={img.name}
                loading="lazy"
                className="h-auto w-full bg-black/20 object-contain transition-transform duration-300 group-hover:scale-105"
              />
            )}

            <div className="pointer-events-none absolute left-0 top-0 z-10 max-w-full space-y-1 p-2">
              {visiblePrimitives instanceof Set &&
                Array.from(visiblePrimitives).map((primitive) => {
                  let value = "";
                  if (primitive === "id") value = img.metadata?.uuid;
                  else if (primitive === "frame_id") value = img.metadata?.frame_id;
                  else if (primitive === "filepath") value = img.id;
                  else if (primitive === "width") value = img.metadata?.width;
                  else if (primitive === "height") value = img.metadata?.height;
                  if (value === undefined || value === null) return null;
                  return (
                    <div
                      key={primitive}
                      className="flex w-fit max-w-full items-baseline gap-1.5 rounded-sm border border-primary/20 bg-black/60 px-1.5 py-0.5 text-[10px] text-primary-foreground shadow-sm backdrop-blur-md"
                    >
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        {primitive}:
                      </span>
                      <span className="break-all whitespace-normal leading-tight text-primary">
                        {String(value)}
                      </span>
                    </div>
                  );
                })}
            </div>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-primary/5 transition-colors group-hover:bg-primary/10">
              <div className="absolute inset-0 rounded-sm border-2 border-primary/0 transition-all group-hover:border-primary/50" />
              <Maximize2 className="h-6 w-6 text-primary opacity-0 drop-shadow-lg transition-opacity group-hover:opacity-100" />
            </div>

            <div className="absolute bottom-8 left-0 right-0 z-20 flex flex-wrap gap-1 p-2">
              {img.tags?.map((tag: string) =>
                visibleTags instanceof Set && visibleTags.has(tag) ? (
                  <span
                    key={tag}
                    className="rounded-sm bg-primary px-1.5 py-0.5 text-[10px] font-sans-tech text-primary-foreground shadow-sm"
                  >
                    {tag}
                  </span>
                ) : null,
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t border-border bg-background/90 p-2">
              <p className="truncate font-sans-tech text-xs text-muted-foreground transition-colors group-hover:text-primary">
                {img.name}
              </p>
              <div className="h-1.5 w-1.5 rounded-full bg-border transition-colors group-hover:bg-primary" />
            </div>
          </div>
        ))}
      </div>

      <div ref={observerTarget} className="mt-4 h-10 w-full" />

      {displayedImages.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
          <p className="font-sans-tech text-sm">No assets found</p>
        </div>
      )}
    </div>
  );
}
