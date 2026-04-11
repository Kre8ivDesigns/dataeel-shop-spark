import { TERMS_SECTIONS_PART1 } from "./termsSections1";
import { TERMS_SECTIONS_PART2 } from "./termsSections2";
import { TERMS_SECTIONS_PART3 } from "./termsSections3";

export const TERMS_SECTIONS = [...TERMS_SECTIONS_PART1, ...TERMS_SECTIONS_PART2, ...TERMS_SECTIONS_PART3];

export { TERMS_INTRO } from "./termsIntro";
export type { TermsBlock, TermsIntroLine, TermsSection } from "./types";
