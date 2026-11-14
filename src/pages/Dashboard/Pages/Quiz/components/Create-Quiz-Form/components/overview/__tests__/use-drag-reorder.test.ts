import { describe, expect, it } from "vitest";

import { reorderTarget, type ItemBox } from "../use-drag-reorder";

/**
 * Where a held card goes (docs/quiz/quiz-overview.md, "Reordering"). The rule is pure, so it is
 * tested without a pointer or a DOM; the frame loop around it is exercised in the browser.
 */

const WIDTH = 200;
const GAP = 16;

/** One column: each card under the last. */
const column = (heights: number[]): ItemBox[] => {
  let top = 0;
  return heights.map((height) => {
    const box = { left: 0, top, width: WIDTH, height };
    top += height + GAP;
    return box;
  });
};

/** The overview's masonry (use-masonry.ts): card `i` in column `i % columns`, under the one above. */
const masonry = (heights: number[], columns: number): ItemBox[] => {
  const tops = new Array<number>(columns).fill(0);
  return heights.map((height, i) => {
    const c = i % columns;
    const box = { left: c * (WIDTH + GAP), top: tops[c], width: WIDTH, height };
    tops[c] += height + GAP;
    return box;
  });
};

const centre = (box: ItemBox) => [box.left + box.width / 2, box.top + box.height / 2] as const;

describe("reorderTarget, one column", () => {
  const boxes = column([100, 100, 100, 100]);

  it("stays until the pointer passes a neighbour's middle", () => {
    // Card 1 (index 0) held; card 2 spans 116–216, middle 166.
    expect(reorderTarget(boxes, 0, 100, 160)).toBe(0);
    expect(reorderTarget(boxes, 0, 100, 170)).toBe(1);
  });

  it("goes as far as the pointer has gone, in either direction", () => {
    expect(reorderTarget(boxes, 0, 100, 420)).toBe(3);
    expect(reorderTarget(boxes, 3, 100, 10)).toBe(0);
    expect(reorderTarget(boxes, 2, 100, 150)).toBe(1);
  });

  it("ignores how far sideways the pointer is", () => {
    expect(reorderTarget(boxes, 0, -500, 170)).toBe(1);
  });
});

describe("reorderTarget, a grid", () => {
  // The quiz in the bug report, roughly: four columns, cards of very different heights.
  const heights = [260, 330, 320, 380, 350, 290, 300, 250, 200, 200];
  const boxes = masonry(heights, 4);

  it("takes the slot of the card the pointer is over", () => {
    const [x, y] = centre(boxes[1]);
    expect(reorderTarget(boxes, 3, x, y)).toBe(1);
    const [x2, y2] = centre(boxes[6]);
    expect(reorderTarget(boxes, 3, x2, y2)).toBe(6);
  });

  it("stays over its own slot", () => {
    const [x, y] = centre(boxes[3]);
    expect(reorderTarget(boxes, 3, x, y)).toBe(3);
  });

  it("stays over a gap, and outside the list", () => {
    // Between columns 1 and 2, and in the gap under card 1.
    expect(reorderTarget(boxes, 3, WIDTH + GAP / 2, 100)).toBe(3);
    expect(reorderTarget(boxes, 3, 100, heights[0] + GAP / 2)).toBe(3);
    expect(reorderTarget(boxes, 3, -50, 100)).toBe(3);
    expect(reorderTarget(boxes, 3, 100, 5000)).toBe(3);
  });

  it("does not pull a card towards a slot the pointer is merely level with", () => {
    // The old reading-order rule: a pointer in column 3, level with card 5 (column 1, second
    // row), counted card 5 as "passed" and sent the held card to column 1. Here it is over
    // card 3, so that is the slot.
    const x = boxes[2].left + 20;
    const y = heights[0] + GAP + 20; // inside card 5's height band, and inside card 3
    expect(y).toBeGreaterThan(boxes[4].top);
    expect(reorderTarget(boxes, 3, x, y)).toBe(2);
  });

  it("gives one answer where the old rule gave two", () => {
    // The flip: card 6 (index 5) sits low in a tall column, card 8 (index 7) high in a short
    // one. Held at index 7 with the pointer above card 6's top and below card 8's own slot,
    // reading order said "before card 6" (go to 5); from 5 it said "past cards 7 and 8" (go
    // back to 7) — every frame. Over no card, the answer is to stay, from either slot.
    const tall = masonry([260, 600, 320, 100, 350, 290, 300, 80, 200, 200], 4);
    const x = tall[3].left + 20; // column 4
    const y = tall[7].top + tall[7].height + GAP / 2; // just under card 8, in the gap
    expect(y).toBeLessThan(tall[5].top);
    expect(reorderTarget(tall, 7, x, y)).toBe(7);
    expect(reorderTarget(tall, 5, x, y)).toBe(5);
  });

  it("skips an item that isn't mounted", () => {
    const sparse: (ItemBox | undefined)[] = [...boxes];
    sparse[1] = undefined;
    const [x, y] = centre(boxes[1]);
    expect(reorderTarget(sparse, 3, x, y)).toBe(3);
  });
});

describe("reorderTarget, edge cases", () => {
  it("returns the index it was given when that index isn't in the list", () => {
    expect(reorderTarget(column([100, 100]), -1, 0, 0)).toBe(-1);
    expect(reorderTarget([], 0, 0, 0)).toBe(0);
  });

  it("treats a single card as nothing to reorder", () => {
    expect(reorderTarget(column([100]), 0, 50, 500)).toBe(0);
  });
});
