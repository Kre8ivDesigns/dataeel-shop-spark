import { describe, expect, it } from "vitest";
import { decodeHtmlEntities } from "./decodeHtmlEntities";

describe("decodeHtmlEntities", () => {
  it("decodes America&apos;s Best Racing (XML apos entity)", () => {
    expect(decodeHtmlEntities("America&apos;s Best Racing")).toBe("America's Best Racing");
  });

  it("decodes common named entities", () => {
    expect(decodeHtmlEntities("A &amp; B &lt; C")).toBe("A & B < C");
    expect(decodeHtmlEntities("&quot;Quoted&quot;")).toBe('"Quoted"');
    expect(decodeHtmlEntities("Pi&nbsp;π")).toBe("Pi\u00A0π");
  });

  it("decodes numeric decimal and hex references", () => {
    expect(decodeHtmlEntities("Hi &#8217;there")).toBe("Hi \u2019there");
    expect(decodeHtmlEntities("Hex &#x2019;")).toBe("Hex \u2019");
  });

  it("resolves double-encoded amp chains (e.g. &amp;apos;)", () => {
    expect(decodeHtmlEntities("America&amp;apos;s Best Racing")).toBe("America's Best Racing");
  });

  it("leaves unknown entity names unchanged", () => {
    expect(decodeHtmlEntities("&notanentity;")).toBe("&notanentity;");
  });

  it("does not throw on surrogate or out-of-range numeric references (leaves entity)", () => {
    expect(() => decodeHtmlEntities("&#55357;")).not.toThrow();
    expect(decodeHtmlEntities("&#55357;")).toBe("&#55357;");
    expect(() => decodeHtmlEntities("&#1114112;")).not.toThrow();
    expect(decodeHtmlEntities("&#1114112;")).toBe("&#1114112;");
    expect(() => decodeHtmlEntities("&#x110000;")).not.toThrow();
    expect(decodeHtmlEntities("&#x110000;")).toBe("&#x110000;");
  });

  it("treats non-string input as empty", () => {
    expect(decodeHtmlEntities(undefined as unknown as string)).toBe("");
  });
});
