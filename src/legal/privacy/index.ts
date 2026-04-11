import { PRIVACY_SECTIONS_PART1 } from "./privacySections1";
import { PRIVACY_SECTIONS_PART2 } from "./privacySections2";
import { PRIVACY_SECTIONS_PART3 } from "./privacySections3";
import { PRIVACY_SECTION_US } from "./privacySections4";
import { PRIVACY_SECTIONS_PART5 } from "./privacySections5";

export const PRIVACY_SECTIONS = [
  ...PRIVACY_SECTIONS_PART1,
  ...PRIVACY_SECTIONS_PART2,
  ...PRIVACY_SECTIONS_PART3,
  ...PRIVACY_SECTION_US,
  ...PRIVACY_SECTIONS_PART5,
];

export {
  PRIVACY_INTRO_PARAGRAPHS,
  PRIVACY_INTRO_BULLETS,
  PRIVACY_INTRO_CLOSING,
  PRIVACY_SUMMARY_POINTS,
  PRIVACY_AFTER_SUMMARY,
} from "./privacyIntro";

export type { PrivacyBlock, PrivacySection } from "./types";
