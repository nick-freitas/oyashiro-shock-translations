import { describe, it, expect } from "vitest";
import {
  BUCKET_INTERVALS,
  computeNewState,
  selectNextCard,
} from "./srs";
import type { CardProgress } from "./types";

describe("BUCKET_INTERVALS", () => {
  it("has 6 buckets (0-5)", () => {
    expect(BUCKET_INTERVALS).toHaveLength(6);
  });

  it("bucket 0 is 0 (immediate)", () => {
    expect(BUCKET_INTERVALS[0]).toBe(0);
  });

  it("bucket 5 is 12 hours in ms", () => {
    expect(BUCKET_INTERVALS[5]).toBe(12 * 60 * 60 * 1000);
  });
});

describe("computeNewState", () => {
  const now = new Date("2026-03-14T12:00:00Z").getTime();

  it("correct on due card advances bucket", () => {
    const card: CardProgress = {
      bucket: 1,
      nextDue: "2026-03-14T11:55:00Z",
      lastReviewed: "2026-03-14T11:50:00Z",
    };
    const result = computeNewState(card, true, now);
    expect(result.bucket).toBe(2);
    expect(result.lastReviewed).toBe(new Date(now).toISOString());
    // nextDue should be now + bucket 2 interval (15 min)
    const expected = new Date(now + 15 * 60 * 1000).toISOString();
    expect(result.nextDue).toBe(expected);
  });

  it("correct on not-yet-due card makes no change", () => {
    const card: CardProgress = {
      bucket: 2,
      nextDue: "2026-03-14T13:00:00Z",
      lastReviewed: "2026-03-14T11:50:00Z",
    };
    const result = computeNewState(card, true, now);
    expect(result.bucket).toBe(2);
    expect(result.nextDue).toBe("2026-03-14T13:00:00Z");
    expect(result.lastReviewed).toBe("2026-03-14T11:50:00Z");
  });

  it("correct on bucket-0 (new) card advances to bucket 1", () => {
    const card: CardProgress = {
      bucket: 0,
      nextDue: null,
      lastReviewed: null,
    };
    const result = computeNewState(card, true, now);
    expect(result.bucket).toBe(1);
    const expected = new Date(now + 5 * 60 * 1000).toISOString();
    expect(result.nextDue).toBe(expected);
  });

  it("correct on bucket 5 stays at bucket 5", () => {
    const card: CardProgress = {
      bucket: 5,
      nextDue: "2026-03-14T00:00:00Z",
      lastReviewed: "2026-03-13T12:00:00Z",
    };
    const result = computeNewState(card, true, now);
    expect(result.bucket).toBe(5);
    const expected = new Date(now + 12 * 60 * 60 * 1000).toISOString();
    expect(result.nextDue).toBe(expected);
  });

  it("wrong on due seen card (bucket >= 1) drops to bucket 1", () => {
    const card: CardProgress = {
      bucket: 4,
      nextDue: "2026-03-14T11:00:00Z",
      lastReviewed: "2026-03-14T07:00:00Z",
    };
    const result = computeNewState(card, false, now);
    expect(result.bucket).toBe(1);
    const expected = new Date(now + 5 * 60 * 1000).toISOString();
    expect(result.nextDue).toBe(expected);
  });

  it("wrong on not-yet-due seen card still drops to bucket 1", () => {
    const card: CardProgress = {
      bucket: 3,
      nextDue: "2026-03-14T13:00:00Z",
      lastReviewed: "2026-03-14T12:00:00Z",
    };
    const result = computeNewState(card, false, now);
    expect(result.bucket).toBe(1);
    const expected = new Date(now + 5 * 60 * 1000).toISOString();
    expect(result.nextDue).toBe(expected);
  });

  it("wrong on new card (bucket 0) stays at bucket 0", () => {
    const card: CardProgress = {
      bucket: 0,
      nextDue: null,
      lastReviewed: null,
    };
    const result = computeNewState(card, false, now);
    expect(result.bucket).toBe(0);
    expect(result.nextDue).toBeNull();
    expect(result.lastReviewed).toBeNull();
  });
});

describe("selectNextCard", () => {
  const now = new Date("2026-03-14T12:00:00Z").getTime();

  it("selects the most overdue card", () => {
    const cards: Record<string, CardProgress> = {
      "q1-o0": { bucket: 1, nextDue: "2026-03-14T11:00:00Z", lastReviewed: "2026-03-14T10:55:00Z" },
      "q1-o1": { bucket: 2, nextDue: "2026-03-14T11:30:00Z", lastReviewed: "2026-03-14T11:15:00Z" },
    };
    const allCardIds = ["q1-o0", "q1-o1"];
    const result = selectNextCard(cards, allCardIds, now);
    // q1-o0 is more overdue (60 min vs 30 min)
    expect(result!.cardId).toBe("q1-o0");
    expect(result!.isDue).toBe(true);
  });

  it("selects bucket-0 cards (treated as epoch 0, maximally overdue)", () => {
    const cards: Record<string, CardProgress> = {
      "q1-o0": { bucket: 1, nextDue: "2026-03-14T11:50:00Z", lastReviewed: "2026-03-14T11:45:00Z" },
    };
    const allCardIds = ["q1-o0", "q2-o0"]; // q2-o0 not in cards = bucket 0
    const result = selectNextCard(cards, allCardIds, now);
    // q2-o0 has nextDue=0 (epoch), so now-0 >> now-11:50
    expect(result!.cardId).toBe("q2-o0");
    expect(result!.isDue).toBe(true);
  });

  it("returns soonest-due card when nothing is due", () => {
    const cards: Record<string, CardProgress> = {
      "q1-o0": { bucket: 3, nextDue: "2026-03-14T13:00:00Z", lastReviewed: "2026-03-14T12:00:00Z" },
      "q1-o1": { bucket: 2, nextDue: "2026-03-14T12:30:00Z", lastReviewed: "2026-03-14T12:15:00Z" },
    };
    const allCardIds = ["q1-o0", "q1-o1"];
    const result = selectNextCard(cards, allCardIds, now);
    expect(result!.cardId).toBe("q1-o1");
    expect(result!.isDue).toBe(false);
    expect(result!.waitMs).toBeGreaterThan(0);
  });

  it("returns null when no cards exist", () => {
    const result = selectNextCard({}, [], now);
    expect(result).toBeNull();
  });
});