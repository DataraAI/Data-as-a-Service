import type { CatalogCard, CategoryLandingContent } from "@/lib/roboDataHubCatalog";

export interface FolderItem {
  name: string;
  full_path: string;
  source_path?: string;
  visibility?: "private" | "public";
  owner_slug?: string;
  viewer_path?: string;
  type?: string;
}

export interface VlmRun {
  effective_prompt?: string;
  tags?: string[];
}

export interface VlmMetadata {
  last_prompt_label?: string | null;
  runs?: Record<string, VlmRun>;
}

export interface ImageMetadata {
  uuid?: string | null;
  date?: string | null;
  uploaded_at?: number | null;
  frame_id?: string | number | null;
  width?: number | null;
  height?: number | null;
  sharpness?: number | null;
  view?: string | null;
  task?: string | null;
  visibility?: string | null;
  frame_count?: number | null;
  fps?: number | null;
  vlm?: VlmMetadata;
}

export interface ImageItem {
  id: string;
  asset_id: string;
  blob_path?: string;
  url: string;
  proxy_url?: string;
  name: string;
  type?: string;
  tags?: string[];
  downloadable?: boolean;
  is_primary_input?: boolean;
  metadata?: ImageMetadata;
  dataset?: {
    id: string;
    visibility: "private" | "public";
    owner_slug: string;
    viewer_path: string;
    vertical?: string;
    task_slug?: string;
  };
}

export type DatasetAsset = ImageItem & {
  blob_path: string;
  downloadable: boolean;
  is_primary_input: boolean;
};

export interface DatasetMiscSection {
  key: "orig" | "egos" | "masks";
  label: string;
  exists: boolean;
  asset_count: number;
  viewer_path: string;
}

export interface DatasetManifest {
  dataset: {
    id: string;
    container: string;
    prefix: string;
    vertical: string;
    task_slug: string;
    task_label: string;
    visibility: "private" | "public";
    viewer_path: string;
  };
  readme: DatasetAsset | null;
  primary_video: DatasetAsset | null;
  downloads: DatasetAsset[];
  misc: Record<"orig" | "egos" | "masks", DatasetMiscSection>;
  hand_meshes: DatasetAsset[];
}

export interface VlmPromptGroup {
  prompt: string;
  tags: string[];
}

export type CategoryKey = "carAutomation" | "serverrack" | "dexterity" | "warehouse";
export type StoragePreviewKey = "carAutomation" | "serverrack" | "humanoid" | "warehouse";

export interface CategoryConfig {
  routeKey: CategoryKey;
  previewKey: StoragePreviewKey;
  publicSlug: string;
  aliases: string[];
  label: string;
  description: string;
}

export interface CategoryPreviewAsset {
  asset_id: string;
  blob_path: string;
  name: string;
  label: string;
  proxy_url: string;
}

export interface CategoryDatasetPreview {
  title: string;
  brand: string;
  full_path: string;
  viewer_path?: string;
  visibility?: "private" | "public";
  owner_slug?: string;
  main_image: CategoryPreviewAsset | null;
  thumbnails: CategoryPreviewAsset[];
  preview_video?: CategoryPreviewAsset | null;
}

export interface ResolvedCatalogCardEntry {
  card: CatalogCard;
  liveItem: CategoryDatasetPreview | null;
  placeholderItem: CategoryDatasetPreview | null;
}

export type ResolvedCatalogSection = Omit<CategoryLandingContent["sections"][number], "cards"> & {
  cards: ResolvedCatalogCardEntry[];
};

export function cloneEntryWithTitle(entry: ResolvedCatalogCardEntry, title: string): ResolvedCatalogCardEntry {
  return {
    ...entry,
    card: {
      ...entry.card,
      title,
    },
  };
}
