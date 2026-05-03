/**
 * Browser-safe downloads from presigned storage URLs.
 * Avoids `window.open(url, "_blank")` after async work — Safari often blocks that as a popup.
 * Fetch → blob → object URL → `<a download>` does not rely on popups.
 */

export type DownloadSignedUrlResult =
  | { status: "downloaded"; method: "blob" | "iframe" }
  | { status: "failed"; error: string }
  /** Last resort: same-tab navigation works everywhere for GET; caller should toast then `location.assign(url)`. */
  | { status: "navigate_same_tab"; url: string };

/** Strip path segments and characters unsafe in `download` / common filesystems. Keeps e.g. `^` (caret filenames). */
export function sanitizeDownloadFileName(raw: string): string {
  let name = raw.trim();
  if (!name) {
    return "racecard.pdf";
  }
  name = name.replace(/^.*[/\\]/, "");
  name = name.replace(/\0/g, "");
  name = name.replace(/[<>:"|?*\x00-\x1f]/g, "_");
  if (!name || name === "." || name === "..") {
    name = "racecard.pdf";
  }
  return name.length > 200 ? name.slice(0, 200) : name;
}

function triggerBlobDownload(objectUrl: string, downloadName: string): void {
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = downloadName;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

function triggerIframeNav(url: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;border:none;";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);
  iframe.src = url;
  window.setTimeout(() => {
    iframe.remove();
  }, 120_000);
}

/**
 * Prefer blob download (needs CORS on the storage origin for `fetch`).
 * If fetch fails (typical: no CORS), hidden iframe (no full-page navigation; tradeoff: some browsers show PDF inside iframe or still download).
 * If iframe setup fails, caller uses same-tab navigation via `status: "navigate_same_tab"` (tradeoff: leaves SPA until Back).
 */
export async function downloadFromSignedUrl(signedUrl: string, preferredFileName: string): Promise<DownloadSignedUrlResult> {
  const safeName = sanitizeDownloadFileName(preferredFileName);

  try {
    const res = await fetch(signedUrl, {
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
    });

    if (!res.ok) {
      return { status: "failed", error: `Download failed (${res.status})` };
    }

    const blob = await res.blob();
    if (blob.size === 0) {
      return { status: "failed", error: "Empty file" };
    }

    const objectUrl = URL.createObjectURL(blob);
    try {
      triggerBlobDownload(objectUrl, safeName);
    } catch {
      URL.revokeObjectURL(objectUrl);
      return { status: "failed", error: "Could not start download" };
    }
    return { status: "downloaded", method: "blob" };
  } catch {
    try {
      triggerIframeNav(signedUrl);
      return { status: "downloaded", method: "iframe" };
    } catch {
      return { status: "navigate_same_tab", url: signedUrl };
    }
  }
}
