#!/usr/bin/env node
/**
 * Renames Equibase-style PDFs in `race cards/` for S3/admin upload.
 *
 * Filename convention (before .pdf):
 *   [track][YYMMDD][-N optional]
 * - **Track:** typically three letters (A–Z); Equibase may emit two-letter prefixes or `Cd^`-style names — non-letters
 *   are stripped and prefixes resolve via racecard-track-prefixes.json.
 * - **YYMMDD:** six digits for the race date (20YY assumed).
 * - **-N:** optional same-day duplicate (-1 → __2 in output name).
 *
 * Output: `TRACKCODE_YYYY-MM-DD.pdf` in `racecards-staging/` (gitignored), never caret form.
 * Direct admin / S3 sync parsing also accepts: `XXXYYMMDD` (three letters + YYMMDD), `XX^YYMMDD`, and optional `__N`
 * before `.pdf` (see `supabase/functions/_shared/parseRacecardFilename.ts`).
 *
 * Usage: npm run prepare:racecards
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "race cards");
const OUT = path.join(ROOT, "racecards-staging");
const PREFIXES = JSON.parse(fs.readFileSync(path.join(__dirname, "racecard-track-prefixes.json"), "utf8"));

/** Prefix (letters; optional `^` / noise stripped later) + YYMMDD + optional -dup */
const FILE_RE = /^(.+?)(\d{2})(\d{2})(\d{2})(?:-(\d+))?\.pdf$/i;

/**
 * Letters only from track prefix; then first three letters = Equibase-style track code for lookup.
 * Two-letter result uses keys like "ct", "gp" in PREFIXES.
 */
function lookupKeyFromTrackLetters(lettersUpper) {
  const three = lettersUpper.slice(0, 3);
  const key3 = three.toLowerCase();
  if (PREFIXES[key3]) return key3;
  const two = lettersUpper.slice(0, 2).toLowerCase();
  if (lettersUpper.length >= 2 && PREFIXES[two]) return two;
  return null;
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error("Missing folder:", SRC);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const files = fs.readdirSync(SRC).filter((f) => f.toLowerCase().endsWith(".pdf"));
  const manifest = [];

  for (const file of files.sort()) {
    const m = FILE_RE.exec(file);
    if (!m) {
      console.warn("Skip (unrecognized name):", file);
      continue;
    }
    const [, prefixRaw, yy, mm, dd, dupNum] = m;
    const lettersOnly = prefixRaw.replace(/[^A-Za-z]/g, "").toUpperCase();
    if (lettersOnly.length < 2) {
      console.warn("Skip (need at least 2 letters in track prefix):", file);
      continue;
    }

    const lookupKey = lookupKeyFromTrackLetters(lettersOnly);
    if (!lookupKey) {
      console.warn("Skip (unknown track letters):", file, "→", lettersOnly.slice(0, 3));
      continue;
    }
    const meta = PREFIXES[lookupKey];
    const year = 2000 + parseInt(yy, 10);
    const raceDate = `${year}-${mm}-${dd}`;
    /** -1 → second card that day (__2), -2 → third (__3), … */
    const dupSuffix = dupNum ? `__${parseInt(dupNum, 10) + 1}` : "";
    const outName = `${meta.track_code}_${raceDate}${dupSuffix}.pdf`;
    const dest = path.join(OUT, outName);

    if (fs.existsSync(dest)) {
      console.warn("Collision (overwrite):", outName, "←", file);
    }
    fs.copyFileSync(path.join(SRC, file), dest);
    manifest.push({
      source: file,
      s3FriendlyName: outName,
      track_code: meta.track_code,
      track_name: meta.track_name,
      race_date: raceDate,
    });
    console.log(file, "→", outName);
  }

  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("\nDone.", manifest.length, "files →", OUT);
  console.log("Next: Admin Dashboard upload each PDF from racecards-staging/, then Sync from S3.");
}

main();
