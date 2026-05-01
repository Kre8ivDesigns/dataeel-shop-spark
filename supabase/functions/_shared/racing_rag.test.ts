import { describe, expect, it } from "vitest";
import {
  hashQuestionSha256,
  normalizeQuestionForCache,
  selectKnowledgeChunks,
  type KnowledgeChunk,
} from "./racing_rag.ts";

describe("normalizeQuestionForCache", () => {
  it("normalizes punctuation and case", () => {
    expect(normalizeQuestionForCache("  What??  IS credits!!  ")).toBe("what is credits");
  });
});

describe("hashQuestionSha256", () => {
  it("is stable for same input", async () => {
    const a = await hashQuestionSha256("how many credits");
    const b = await hashQuestionSha256("how many credits");
    expect(a).toBe(b);
    expect(a.length).toBe(64);
  });
});

describe("selectKnowledgeChunks", () => {
  const chunks: KnowledgeChunk[] = [
    {
      id: "credits",
      keywords: ["credit", "credits", "price", "buy"],
      body: "One credit equals one full day of RaceCards.",
    },
    {
      id: "algo",
      keywords: ["concert", "aptitude", "algorithm"],
      body: "Concert and Aptitude are two proprietary algorithms.",
    },
    {
      id: "tracks",
      keywords: ["track", "tracks", "churchill"],
      body: "DATAEEL covers many North American tracks.",
    },
  ];

  const guard: KnowledgeChunk = {
    id: "guard",
    keywords: [],
    body: "GUARD: never promise locks.",
  };

  it("prefers chunks matching query terms", () => {
    const out = selectKnowledgeChunks("how do I buy credits pricing", chunks, guard, 800);
    expect(out).toContain("One credit equals");
    expect(out).toContain("GUARD:");
  });

  it("falls back when nothing matches", () => {
    const out = selectKnowledgeChunks("zzz unrelated query xyz", chunks, null, 500, 2);
    expect(out.length).toBeGreaterThan(20);
  });
});
