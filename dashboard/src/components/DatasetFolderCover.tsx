import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { datasetCoverBlobCandidates, frontPageImageUrl } from "@/lib/datasetFolderCover";

interface DatasetFolderCoverProps {
  fullPath: string;
  FallbackIcon: LucideIcon;
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
  const src = useMemo(() => {
    const candidates = datasetCoverBlobCandidates(fullPath);
    return candidates
      .map((candidate) => frontPageImageUrl(candidate))
      .find((candidate): candidate is string => Boolean(candidate));
  }, [fullPath]);

  if (!src) {
    return (
      <div className={className}>
        <FallbackIcon className={iconClassName} aria-hidden />
      </div>
    );
  }

  return (
    <div className={className}>
      <img src={src} alt="" loading="lazy" decoding="async" className={imgClassName} />
    </div>
  );
}
