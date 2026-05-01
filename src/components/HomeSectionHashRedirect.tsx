import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/** Section ids rendered on the marketing home page (`/`). */
const HOME_PAGE_SECTION_IDS = new Set([
  "how-it-works",
  "results",
  "racecards",
  "us-racing-news",
  "about",
  "faq",
]);

/**
 * Footer/header used to link with `#section`, which kept the current path (e.g.
 * `/account-settings#how-it-works`) where no matching element exists. Links now
 * use `/#section`; this redirects legacy or mistaken URLs on non-home routes.
 */
export function HomeSectionHashRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const id = location.hash.replace(/^#/, "");
    if (!id || !HOME_PAGE_SECTION_IDS.has(id)) return;
    if (location.pathname === "/") return;
    navigate({ pathname: "/", hash: id, search: location.search }, { replace: true });
  }, [location.pathname, location.hash, location.search, navigate]);

  return null;
}
