import type { CardProgress } from "./types";

// Bucket intervals in milliseconds
export const BUCKET_INTERVALS = [
  0,                    // 0: New — immediate
  5 * 60 * 1000,        // 1: Learning — 5 min
  15 * 60 * 1000,       // 2: Reviewing — 15 min
  60 * 60 * 1000,       // 3: Familiar — 1 hour
  4 * 60 * 60 * 1000,   // 4: Known — 4 hours
  12 * 60 * 60 * 1000,  // 5: Mastered — 12 hours
];

const MAX_BUCKET = BUCKET_INTERVALS.length - 1;

export function computeNewState(
  card: CardProgress,
  correct: boolean,
  nowMs: number
): CardProgress {
  // Wrong on new card: stay at bucket 0, no change
  if (!correct && card.bucket === 0) {
    return { ...card };
  }

  // Wrong on seen card: drop to bucket 1
  if (!correct) {
    return {
      bucket: 1,
      nextDue: new Date(nowMs + BUCKET_INTERVALS[1]).toISOString(),
      lastReviewed: new Date(nowMs).toISOString(),
    };
  }

  // Correct: check if card is due
  const isDue =
    card.bucket === 0 ||
    card.nextDue === null ||
    nowMs >= new Date(card.nextDue).getTime();

  if (!isDue) {
    // Correct but not yet due: no change
    return { ...card };
  }

  // Correct and due: advance bucket
  const newBucket = Math.min(card.bucket + 1, MAX_BUCKET);
  return {
    bucket: newBucket,
    nextDue: new Date(nowMs + BUCKET_INTERVALS[newBucket]).toISOString(),
    lastReviewed: new Date(nowMs).toISOString(),
  };
}

export interface NextCardResult {
  cardId: string;
  isDue: boolean;
  waitMs?: number;
}

export function selectNextCard(
  cards: Record<string, CardProgress>,
  allCardIds: string[],
  nowMs: number
): NextCardResult | null {
  if (allCardIds.length === 0) return null;

  // Build scored list: [cardId, overdueMs]
  const scored: Array<{ cardId: string; overdueMs: number; nextDueMs: number }> = [];

  for (const cardId of allCardIds) {
    const card = cards[cardId];
    let nextDueMs: number;

    if (!card || card.bucket === 0 || card.nextDue === null) {
      // New card: treat as epoch 0
      nextDueMs = 0;
    } else {
      nextDueMs = new Date(card.nextDue).getTime();
    }

    scored.push({
      cardId,
      overdueMs: nowMs - nextDueMs,
      nextDueMs,
    });
  }

  // Shuffle to break ties randomly
  for (let i = scored.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [scored[i], scored[j]] = [scored[j], scored[i]];
  }

  // Sort by overdueMs descending (most overdue first)
  scored.sort((a, b) => b.overdueMs - a.overdueMs);

  const top = scored[0];

  if (top.overdueMs >= 0) {
    return { cardId: top.cardId, isDue: true };
  }

  // Nothing is due — return the soonest-due card
  // Sort by nextDueMs ascending for this
  scored.sort((a, b) => a.nextDueMs - b.nextDueMs);
  const soonest = scored[0];
  return {
    cardId: soonest.cardId,
    isDue: false,
    waitMs: soonest.nextDueMs - nowMs,
  };
}

export function pickDistractors(pool: string[]): string[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 3);
}
