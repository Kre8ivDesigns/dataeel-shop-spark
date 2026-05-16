import { describe, expect, it } from "vitest";
import { sanitizeCmsCss, sanitizeCmsHtml } from "./cmsHtml";

describe("cmsHtml", () => {
  it("removes executable tags and event attributes", () => {
    const result = sanitizeCmsHtml(`<section onclick="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">x</a></section>`);

    expect(result).not.toContain("<script");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("javascript:");
    expect(result).toContain("<section");
  });

  it("removes unsafe inline css", () => {
    const result = sanitizeCmsHtml(`<div style="background:url(javascript:alert(1))">x</div>`);
    expect(result).not.toContain("style=");
  });

  it("strips style-breakout tokens from css", () => {
    expect(sanitizeCmsCss(".x{color:red}</style><script>bad()</script>")).not.toContain("</style");
  });
});
