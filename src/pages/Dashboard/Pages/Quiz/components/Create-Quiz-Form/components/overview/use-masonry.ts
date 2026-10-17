import { useLayoutEffect, useState, type RefObject } from "react";

/** Where one item sits in the masonry, in px from the list's top-left. */
export interface MasonrySlot {
  left: number;
  top: number;
  width: number;
}

export interface MasonryLayout {
  slots: Map<number, MasonrySlot>;
  /** The tallest column — the list's height, since every item is absolutely placed. */
  height: number;
}

export interface UseMasonryOptions {
  /** The list. Its items carry `data-masonry-id`, and it must be `position: relative`. */
  listRef: RefObject<HTMLElement | null>;
  /** The items' ids, in order. */
  ids: number[];
  /** Off below the breakpoint: the list is a plain column there and no item is placed. */
  enabled: boolean;
  /** Columns are at least this wide; as many as fit. */
  minColumnWidth: number;
  /** The gap between columns and between items in a column, px. */
  gap: number;
}

const same = (a: MasonryLayout | null, b: MasonryLayout) => {
  if (
    !a ||
    a.slots.size !== b.slots.size ||
    Math.abs(a.height - b.height) > 0.5
  )
    return false;
  for (const [id, s] of b.slots) {
    const o = a.slots.get(id);
    if (
      !o ||
      Math.abs(o.left - s.left) > 0.5 ||
      Math.abs(o.top - s.top) > 0.5 ||
      Math.abs(o.width - s.width) > 0.5
    ) {
      return false;
    }
  }
  return true;
};

/**
 * A masonry for the overview's questions on a wide screen: columns as many as fit, each card
 * straight under the one above it in its column, so a tall card pushes only its own column down
 * rather than stretching every card in its row (docs/quiz/quiz-overview.md, "Wide screens").
 *
 * <b>Order is round-robin</b> — item `i` goes in column `i % columns` — not "shortest column
 * first". Shortest-first packs tighter, but it decides each card's column by the heights above
 * it, so revealing one answer could send the next card to a different column: the order on
 * screen would change without anyone reordering. Round-robin keeps 1, 2, 3 across the top and
 * 4, 5, 6 under them, whatever the heights, which is also what the drag reads
 * (use-drag-reorder.ts, reading order).
 *
 * <b>Why not CSS.</b> `columns` fills top to bottom (1, 2, 3 down the first column), and
 * `grid-template-rows: masonry` isn't shipped. So the list is `relative` with a set height and
 * each item absolutely placed from measured heights. A slot change is a re-render, so framer's
 * `layout` still slides the other cards to their new places.
 *
 * Measured in a layout effect after every render (cheap: one pass over the items, and the
 * state only changes when a slot moves), plus a ResizeObserver for size changes that come
 * without a render of this component — an answer revealed, an image loading, the window resizing.
 */
export const useMasonry = ({
  listRef,
  ids,
  enabled,
  minColumnWidth,
  gap,
}: UseMasonryOptions): MasonryLayout | null => {
  const [layout, setLayout] = useState<MasonryLayout | null>(null);

  const measure = () => {
    const list = listRef.current;
    if (!enabled || !list) {
      setLayout((prev) => (prev === null ? prev : null));
      return;
    }
    const width = list.clientWidth;
    const columns = Math.max(
      1,
      Math.floor((width + gap) / (minColumnWidth + gap)),
    );
    const columnWidth = (width - gap * (columns - 1)) / columns;
    const heights = new Array<number>(columns).fill(0);
    const slots = new Map<number, MasonrySlot>();

    ids.forEach((id, i) => {
      const el = list.querySelector<HTMLElement>(
        `:scope > [data-masonry-id="${id}"]`,
      );
      const column = i % columns;
      slots.set(id, {
        left: column * (columnWidth + gap),
        top: heights[column],
        width: columnWidth,
      });
      heights[column] += (el?.offsetHeight ?? 0) + gap;
    });

    const next = { slots, height: Math.max(0, Math.max(...heights) - gap) };
    setLayout((prev) => (same(prev, next) ? prev : next));
  };

  // Every render: the ids, the widths, and the heights all feed one pass.
  useLayoutEffect(measure);

  // Size changes that don't re-render this component. Re-observed when the items change, so a
  // new card is watched and a removed one let go.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!enabled || !list || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(list);
    list
      .querySelectorAll<HTMLElement>(":scope > [data-masonry-id]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // `measure` reads the latest props through the closure of the render that set this up;
    // a change in ids or enabled re-runs it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ids.join(",")]);

  return enabled ? layout : null;
};
