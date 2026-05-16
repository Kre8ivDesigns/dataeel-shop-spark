const UNSAFE_ELEMENTS = "script, iframe, object, embed, meta, link";
const UNSAFE_URL_PATTERN = /^(?:javascript:|data:text\/html)/i;
const UNSAFE_CSS_PATTERN = /(?:<\/style|javascript:|expression\s*\()/i;

export function sanitizeCmsHtml(html: string): string {
  if (!html.trim()) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll(UNSAFE_ELEMENTS).forEach((node) => node.remove());

  doc.querySelectorAll("*").forEach((node) => {
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();

      if (name.startsWith("on")) {
        node.removeAttribute(attr.name);
        continue;
      }

      if ((name === "href" || name === "src" || name === "xlink:href") && UNSAFE_URL_PATTERN.test(value)) {
        node.removeAttribute(attr.name);
        continue;
      }

      if (name === "style" && UNSAFE_CSS_PATTERN.test(value)) {
        node.removeAttribute(attr.name);
      }
    }
  });

  return doc.body.innerHTML;
}

export function sanitizeCmsCss(css: string): string {
  return css.replace(UNSAFE_CSS_PATTERN, "");
}
