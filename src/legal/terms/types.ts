export type TermsBlock =
  | { type: "p"; text: string }
  | { type: "caps"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] };

export type TermsSection = {
  id: string;
  num: number;
  title: string;
  blocks: TermsBlock[];
};

export type TermsIntroLine = { type: "p" | "caps"; text: string };
