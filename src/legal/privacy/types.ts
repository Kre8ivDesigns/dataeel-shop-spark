export type PrivacyBlock =
  | { type: "p"; text: string }
  | { type: "caps"; text: string }
  | { type: "h3"; text: string }
  | { type: "h4"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "table"; headers: [string, string, string]; rows: [string, string, string][] };

export type PrivacySection = {
  id: string;
  num: number;
  title: string;
  blocks: PrivacyBlock[];
};
