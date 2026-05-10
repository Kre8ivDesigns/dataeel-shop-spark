const ODDS_RE = /^(?:\d{1,3}-\d{1,3}|even|evens?|scr|ae)$/i;
const SCORE_RE = /^\d{1,3}(?:\.\d+)?$/;

function centerX(word) {
  const box = word.Geometry?.BoundingBox ?? {};
  return Number(box.Left ?? 0) + Number(box.Width ?? 0) / 2;
}

function centerY(word) {
  const box = word.Geometry?.BoundingBox ?? {};
  return Number(box.Top ?? 0) + Number(box.Height ?? 0) / 2;
}

function confidence(words) {
  const values = words.map((word) => Number(word.Confidence)).filter(Number.isFinite);
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function isHeaderText(text) {
  return /horse|name|number|odds|concert|aptitude|notes|dataeel|algorithms|race\s*@/i.test(text);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanHorseName(value, horseNumber) {
  let cleaned = value
    .replace(/\s+/g, " ")
    .replace(/[|_]+/g, "")
    .trim();

  if (horseNumber) {
    cleaned = cleaned.replace(new RegExp(`\\s+${escapeRegExp(horseNumber)}$`), "").trim();
  }

  return cleaned;
}

function wordsIn(words, minX, maxX) {
  return words.filter((word) => {
    const x = centerX(word);
    return x >= minX && x < maxX;
  });
}

function text(words) {
  return words.map((word) => word.Text).join(" ").trim();
}

function findFirst(words, pattern) {
  return words.find((word) => pattern.test(String(word.Text ?? "").trim()))?.Text?.trim() ?? null;
}

function scoreFrom(words) {
  const found = words.find((word) => SCORE_RE.test(String(word.Text ?? "").trim()));
  if (!found) return null;
  const score = Number(found.Text);
  return Number.isFinite(score) ? score : null;
}

function parseSide(rowWords, config, algorithm, raceNumber, rank) {
  const nameWords = wordsIn(rowWords, config.nameMin, config.nameMax);
  const horseNumberWords = wordsIn(rowWords, config.numberMin, config.numberMax);
  const oddsWords = wordsIn(rowWords, config.oddsMin, config.oddsMax);
  const scoreWords = wordsIn(rowWords, config.scoreMin, config.scoreMax);

  const horseNumber = findFirst(horseNumberWords, /^[A-Za-z0-9]+$/);
  const horseName = cleanHorseName(text(nameWords), horseNumber);
  const odds = findFirst(oddsWords, ODDS_RE);
  const score = scoreFrom(scoreWords);
  const rawText = text([...nameWords, ...horseNumberWords, ...oddsWords, ...scoreWords]);

  if (!horseName || horseName.length < 2 || isHeaderText(horseName)) return null;
  if (!horseNumber && !odds && score === null) return null;

  return {
    race_number: raceNumber,
    algorithm,
    rank,
    horse_name: horseName,
    horse_number: horseNumber,
    odds,
    score,
    ocr_confidence: confidence([...nameWords, ...horseNumberWords, ...oddsWords, ...scoreWords]),
    raw_text: rawText || null,
  };
}

function groupRows(pageWords) {
  const sorted = [...pageWords].sort((a, b) => centerY(a) - centerY(b) || centerX(a) - centerX(b));
  const rows = [];

  for (const word of sorted) {
    const y = centerY(word);
    let row = rows.find((candidate) => Math.abs(candidate.y - y) < 0.008);
    if (!row) {
      row = { y, words: [] };
      rows.push(row);
    }
    row.words.push(word);
    row.y = (row.y * (row.words.length - 1) + y) / row.words.length;
  }

  return rows
    .map((row) => ({ ...row, words: row.words.sort((a, b) => centerX(a) - centerX(b)) }))
    .sort((a, b) => a.y - b.y);
}

export function parseRacecardPredictions(blocks) {
  const words = blocks.filter((block) => block.BlockType === "WORD" && block.Text && block.Geometry?.BoundingBox);
  const pages = new Map();

  for (const word of words) {
    const page = Number(word.Page ?? 1);
    if (!pages.has(page)) pages.set(page, []);
    pages.get(page).push(word);
  }

  const predictions = [];
  const tableConfigs = [
    {
      algorithm: "concert",
      nameMin: 0.06,
      nameMax: 0.30,
      numberMin: 0.27,
      numberMax: 0.33,
      oddsMin: 0.32,
      oddsMax: 0.39,
      scoreMin: 0.37,
      scoreMax: 0.47,
    },
    {
      algorithm: "aptitude",
      nameMin: 0.52,
      nameMax: 0.73,
      numberMin: 0.71,
      numberMax: 0.77,
      oddsMin: 0.76,
      oddsMax: 0.83,
      scoreMin: 0.82,
      scoreMax: 0.92,
    },
  ];

  for (const [page, pageWords] of [...pages.entries()].sort((a, b) => a[0] - b[0])) {
    const rows = groupRows(pageWords)
      .filter((row) => row.y > 0.28 && row.y < 0.76)
      .filter((row) => !isHeaderText(text(row.words)));

    for (const config of tableConfigs) {
      let rank = 1;
      for (const row of rows) {
        const parsed = parseSide(row.words, config, config.algorithm, page, rank);
        if (!parsed) continue;
        predictions.push(parsed);
        rank += 1;
      }
    }
  }

  return predictions;
}
