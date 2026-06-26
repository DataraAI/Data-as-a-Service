import { useEffect } from "react";
import { formatPageTitle } from "@/lib/pageTitle";

export function usePageTitle(pageName: string) {
  useEffect(() => {
    document.title = formatPageTitle(pageName);
  }, [pageName]);
}
