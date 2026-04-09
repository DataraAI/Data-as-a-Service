import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { blobProxyUrl, datasetCoverBlobCandidates } from "@/lib/datasetFolderCover";

interface DatasetFolderCoverProps {
  fullPath: string;
  FallbackIcon: LucideIcon;
  /** Wrapper around image or icon */
  className?: string;
  imgClassName?: string;
  iconClassName?: string;
}

export function DatasetFolderCover({
  fullPath,
  FallbackIcon,
  className,
  imgClassName,
  iconClassName,
}: DatasetFolderCoverProps) {
  const candidates = useMemo(() => datasetCoverBlobCandidates(fullPath), [fullPath]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setAttempt(0);
  }, [fullPath]);

  if (candidates.length === 0 || attempt >= candidates.length) {
    return (
      <div className={className}>
        <FallbackIcon className={iconClassName} aria-hidden />
      </div>
    );
  }

  const src = blobProxyUrl(candidates[attempt]);

  return (
    <div className={className}>
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className={imgClassName}
        onError={() => setAttempt((a) => a + 1)}
      />
    </div>
  );
}
