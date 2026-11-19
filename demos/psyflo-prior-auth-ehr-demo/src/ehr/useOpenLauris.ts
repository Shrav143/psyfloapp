import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { paths } from "@/routes";
import { useStore } from "@/store";

/** Takes the person from a Psyflo page to Lauris (the clinic's EHR), remembering the page so the Psyflo tab there brings them back to it. */
export function useOpenLauris(): (to: { case: string; view?: "auth" | "denial" }) => void {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  return useCallback(
    (to) => {
      useStore.getState().ehrOpen(pathname + search);
      navigate(paths.lauris(to));
    },
    [navigate, pathname, search],
  );
}

export const LAURIS_HINT = "Opens the authorization form in Lauris. The Psyflo extension there suggests and types the recommendations.";
