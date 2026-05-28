import type { CatalogImageSet } from "./roboDataHubCatalog";

export const ROBO_DATA_HUB_MARKETING_IMAGE_OVERRIDES: Record<string, CatalogImageSet> = {};

export function getRoboDataHubMarketingImageSet(pathLabel: string): CatalogImageSet | null {
  return ROBO_DATA_HUB_MARKETING_IMAGE_OVERRIDES[pathLabel] ?? null;
}
