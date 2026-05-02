import { describe, expect, it } from "vitest";
import { parseRacecardFilename, stripRacecardUuidPrefix } from "./parseRacecardFilename";

describe("stripRacecardUuidPrefix", () => {
  it("strips a leading uuid", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(stripRacecardUuidPrefix(`${id}-CD_2026-05-07.pdf`)).toBe("CD_2026-05-07.pdf");
  });

  it("leaves names without uuid unchanged", () => {
    expect(stripRacecardUuidPrefix("Cd^260507.pdf")).toBe("Cd^260507.pdf");
  });
});

describe("parseRacecardFilename", () => {
  it("parses TRACKCODE_YYYY-MM-DD", () => {
    expect(parseRacecardFilename("CD_2026-05-07.pdf")).toEqual({
      trackCode: "CD",
      raceDate: "2026-05-07",
    });
  });

  it("parses three-letter AQU_YYYY-MM-DD", () => {
    expect(parseRacecardFilename("AQU_2026-05-07.pdf")).toEqual({
      trackCode: "AQU",
      raceDate: "2026-05-07",
    });
  });

  it("parses optional same-day index __N", () => {
    expect(parseRacecardFilename("CD_2026-05-07__2.pdf")).toEqual({
      trackCode: "CD",
      raceDate: "2026-05-07",
    });
  });

  it("parses TRACKCODE^YYMMDD (caret convention)", () => {
    expect(parseRacecardFilename("Cd^260507.pdf")).toEqual({
      trackCode: "CD",
      raceDate: "2026-05-07",
    });
  });

  it("parses XXXYYMMDD (three letters + YYMMDD, no separator)", () => {
    expect(parseRacecardFilename("AQU260507.pdf")).toEqual({
      trackCode: "AQU",
      raceDate: "2026-05-07",
    });
  });

  it("parses XXXYYMMDD with __N suffix", () => {
    expect(parseRacecardFilename("AQU260507__2.pdf")).toEqual({
      trackCode: "AQU",
      raceDate: "2026-05-07",
    });
  });

  it("parses caret form with __N suffix", () => {
    expect(parseRacecardFilename("Cd^260507__2.pdf")).toEqual({
      trackCode: "CD",
      raceDate: "2026-05-07",
    });
  });

  it("strips uuid prefix before parsing", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(parseRacecardFilename(`racecards/${id}-Cd^260507.pdf`)).toEqual({
      trackCode: "CD",
      raceDate: "2026-05-07",
    });
    expect(parseRacecardFilename(`${id}-AQU260507.pdf`)).toEqual({
      trackCode: "AQU",
      raceDate: "2026-05-07",
    });
  });

  it("maps sanitized Cd_260507 (caret removed) to YYMMDD", () => {
    expect(parseRacecardFilename("Cd_260507.pdf")).toEqual({
      trackCode: "CD",
      raceDate: "2026-05-07",
    });
  });

  it("uses UNK and a valid ISO date when pattern unknown", () => {
    const out = parseRacecardFilename("not-a-racecard.pdf");
    expect(out.trackCode).toBe("UNK");
    expect(out.raceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("rejects three-plus-letter caret prefix but still reads YYMMDD", () => {
    expect(parseRacecardFilename("ABC^260507.pdf")).toEqual({
      trackCode: "UNK",
      raceDate: "2026-05-07",
    });
  });
});
