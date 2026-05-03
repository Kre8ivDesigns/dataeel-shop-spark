import { describe, expect, it } from "vitest";
import { sanitizeDownloadFileName } from "./downloadSignedUrl";

describe("sanitizeDownloadFileName", () => {
  it("preserves caret convention filenames", () => {
    expect(sanitizeDownloadFileName("Cd^260502.pdf")).toBe("Cd^260502.pdf");
  });

  it("strips path segments", () => {
    expect(sanitizeDownloadFileName("evil/path/CD_2026-01-01.pdf")).toBe("CD_2026-01-01.pdf");
  });

  it("replaces illegal characters", () => {
    expect(sanitizeDownloadFileName('bad"|file.pdf')).toBe("bad__file.pdf");
  });

  it("falls back for empty input", () => {
    expect(sanitizeDownloadFileName("   ")).toBe("racecard.pdf");
  });

  it("truncates very long names", () => {
    const long = "a".repeat(300) + ".pdf";
    expect(sanitizeDownloadFileName(long).length).toBe(200);
  });
});
