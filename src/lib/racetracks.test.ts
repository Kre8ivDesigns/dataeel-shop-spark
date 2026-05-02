import { describe, expect, it } from "vitest";
import { getRacetrackLabel } from "./racetracks";

describe("getRacetrackLabel", () => {
  const churchill = "Churchill Downs";

  it("maps CD to Churchill Downs", () => {
    expect(getRacetrackLabel("CD")).toBe(churchill);
  });

  it("uppercases cd", () => {
    expect(getRacetrackLabel("cd")).toBe(churchill);
  });

  it("strips trailing caret from CD^", () => {
    expect(getRacetrackLabel("CD^")).toBe(churchill);
  });
});
