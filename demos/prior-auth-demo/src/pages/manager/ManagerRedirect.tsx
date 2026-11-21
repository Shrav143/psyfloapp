import { Navigate, useSearchParams } from "react-router-dom";

/** Case Manager is part of Authorizations. Old /manager and /active links land on the matching view: ?tab=reviews on Reviews this week (with ?review= opening
    that review), ?show=active and ?show=renewal on the same Dashboard filters, anything else on the worklist. */
export default function ManagerRedirect() {
  const [params] = useSearchParams();
  const out = new URLSearchParams();
  // Always name the view, so the worklist opens on it instead of the last view used.
  out.set("view", params.get("tab") === "reviews" || params.has("review") ? "reviews" : "all");
  const show = params.get("show");
  if (show === "active" || show === "renewal") out.set("show", show);
  const review = params.get("review");
  if (review) out.set("review", review);
  const qs = out.toString();
  return <Navigate to={`/authorizations${qs ? `?${qs}` : ""}`} replace />;
}
