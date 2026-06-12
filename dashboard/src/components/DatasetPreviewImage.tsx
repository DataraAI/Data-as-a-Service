import { resolvePreviewMediaUrl } from "@/lib/dataViewerUtils";
import type { CategoryPreviewAsset } from "@/lib/dataViewerTypes";
import { Database } from "lucide-react";
import { useState } from "react";

export function DatasetPreviewImage({
  asset,
  alt,
  className,
}: {
  asset: CategoryPreviewAsset | null | undefined;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : resolvePreviewMediaUrl(asset);

  return (
    <div
      className={`relative h-full min-h-0 overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100 ${className ?? ""}`}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full min-h-0 items-center justify-center bg-slate-100">
          <Database className="h-8 w-8 text-primary/55" />
        </div>
      )}
    </div>
  );
}
