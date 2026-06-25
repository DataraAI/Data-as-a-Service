import type { AuthUser } from "@/auth/AuthProvider";

export const IMPORT_DATA_QUERY_PARAM = "import";
export const IMPORT_DATA_QUERY_VALUE = "data";
export const ROBODATAHUB_IMPORT_DATA_PATH = `/robodatahub?${IMPORT_DATA_QUERY_PARAM}=${IMPORT_DATA_QUERY_VALUE}`;

export function canImportData({
  isAuthenticated,
  isApproved,
  user,
}: {
  isAuthenticated: boolean;
  isApproved: boolean;
  user: Pick<AuthUser, "role"> | null | undefined;
}) {
  return isAuthenticated && isApproved && (user?.role === "admin" || user?.role === "analyst");
}
