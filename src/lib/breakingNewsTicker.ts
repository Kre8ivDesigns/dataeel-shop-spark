const DEFAULT_MIN_TICKER_ITEMS = 24;

export function buildTickerLoopItems(items: string[], minItems = DEFAULT_MIN_TICKER_ITEMS): string[] {
  const cleaned = items.map((item) => item.trim()).filter(Boolean);
  if (cleaned.length === 0) return [];

  const loopItems = [...cleaned];
  while (loopItems.length < minItems) {
    loopItems.push(...cleaned);
  }

  return loopItems;
}

export function tickerDurationSeconds(items: string[]): number {
  const totalChars = items.reduce((sum, item) => sum + item.length, 0);
  const duration = Math.round(totalChars / 4);
  return Math.min(Math.max(duration, 90), 420);
}
