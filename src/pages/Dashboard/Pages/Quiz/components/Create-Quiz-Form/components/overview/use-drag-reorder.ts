import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, useMotionValue } from "framer-motion";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";

/** Edge zones (px from the scroller's top/bottom) where a held card scrolls the page. */
const EDGE_TOP = 80;
/** Deeper at the bottom: the overview's pinned bar covers the last ~70px. */
const EDGE_BOTTOM = 130;
/** Top auto-scroll speed, px per frame, reached at the very edge. */
const MAX_SCROLL_PX = 16;

/** The nearest ancestor that actually scrolls — the dashboard's <main> in the app. */
const findScroller = (from: HTMLElement | null): HTMLElement | null => {
  for (
    let node = from?.parentElement ?? null;
    node;
    node = node.parentElement
  ) {
    const { overflowY } = getComputedStyle(node);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
  }
  return (document.scrollingElement as HTMLElement | null) ?? null;
};

const move = <T>(list: T[], from: number, to: number): T[] => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export interface UseDragReorderOptions<T> {
  items: T[];
  getId: (item: T) => number;
  onReorder: (items: T[]) => void;
}

/**
 * Drag-to-reorder by a grip, for a vertical list or a grid read left to right, top to bottom —
 * the overview lays its questions out in columns on a wide screen. Scrolls the page when you
 * hold a card near the top or bottom edge (docs/quiz/quiz-overview.md, "Reordering").
 *
 * <b>Why not framer-motion's `Reorder`.</b> It was the first version and it can't do the
 * auto-scroll: its drag is a transform from where the pointer went down, so when the scroll
 * container moves the content under a held card, the card scrolls away with the content — and
 * `Reorder` settles the new order from that same stale offset before any correction can run.
 * The dashboard scrolls its `<main>`, not the window, which is the case it doesn't cover.
 *
 * Here the card's position is derived every frame from the pointer and the list's *current*
 * layout, so scrolling — by the user or by the edge loop — can't separate them, and the order is
 * decided from where the card actually is. The other items still slide with framer's `layout`
 * animation; only the dragged one is positioned by hand.
 *
 * The list element must be the items' offsetParent (`position: relative`) — offsets are
 * measured against it.
 */
export const useDragReorder = <T>({
  items,
  getId,
  onReorder,
}: UseDragReorderOptions<T>) => {
  const listRef = useRef<HTMLOListElement | HTMLDivElement | null>(null);
  const itemEls = useRef(new Map<number, HTMLElement>());
  // `positionedId`: the card placed by hand (while held, and while it settles after the drop).
  // `liftedId`: the card shown picked up — only while held.
  const [positionedId, setPositionedId] = useState<number | null>(null);
  const [liftedId, setLiftedId] = useState<number | null>(null);
  /**
   * How far the held card sits from its layout slot. Motion values, not state: they change
   * every frame, and setting one writes the transform directly — no render per frame.
   */
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  // Read inside the frame loop, which outlives any one render.
  const latest = useRef({ items, getId, onReorder });
  latest.current = { items, getId, onReorder };

  const drag = useRef<{
    id: number;
    grabOffsetX: number;
    grabOffset: number;
    pointerX: number;
    pointerY: number;
    wantedLeft: number;
    wantedTop: number;
    scroller: HTMLElement | null;
    frame: number | null;
  } | null>(null);

  /** Put the held card under the pointer, measured against the list as it is laid out *now*. */
  const position = () => {
    const d = drag.current;
    const list = listRef.current;
    const el = d ? itemEls.current.get(d.id) : undefined;
    if (!d || !list || !el) return;
    const rect = list.getBoundingClientRect();
    dragX.set(d.wantedLeft - (rect.left + el.offsetLeft));
    dragY.set(d.wantedTop - (rect.top + el.offsetTop));
  };

  /**
   * After a reorder renders, re-place the card *before the browser paints*. Without this the
   * frame that applied the new order still carried the offset worked out for the old slot, and
   * the card jumped by a whole card's height for one frame — the glitch on every swap.
   */
  //
  // After *every* render, not only a reorder: on a wide screen the masonry places the cards in
  // a second render after the reorder (use-masonry.ts), and the held card's slot moves then.
  useLayoutEffect(() => {
    position();
  });

  const step = () => {
    const d = drag.current;
    const list = listRef.current;
    const el = d ? itemEls.current.get(d.id) : undefined;
    if (!d || !list || !el) return;

    // 1. Auto-scroll when held near an edge — faster the closer it gets.
    if (d.scroller) {
      const { top, bottom } = d.scroller.getBoundingClientRect();
      let speed = 0;
      if (d.pointerY < top + EDGE_TOP)
        speed = -(top + EDGE_TOP - d.pointerY) / EDGE_TOP;
      else if (d.pointerY > bottom - EDGE_BOTTOM)
        speed = (d.pointerY - (bottom - EDGE_BOTTOM)) / EDGE_BOTTOM;
      if (speed !== 0)
        d.scroller.scrollTop +=
          Math.max(-1, Math.min(1, speed)) * MAX_SCROLL_PX;
    }

    // 2. Where the card should be (under the pointer) vs where layout has put it.
    // Kept within the list: a card dragged past its end would grow the page by its own
    // transform, and the edge loop would then keep scrolling into the room it had just made.
    const { top: listTop, left: listLeft } = list.getBoundingClientRect();
    d.wantedTop = Math.min(
      Math.max(d.pointerY - d.grabOffset, listTop),
      listTop + list.offsetHeight - el.offsetHeight,
    );
    d.wantedLeft = Math.min(
      Math.max(d.pointerX - d.grabOffsetX, listLeft),
      listLeft + list.offsetWidth - el.offsetWidth,
    );

    // 3. Its place in the order: once the *pointer* is past the middle of a neighbour, the
    //    card takes that slot. The pointer, not the card's middle — the card is clamped to
    //    the list, and a tall card held at the bottom could never get its middle past a
    //    shorter last one. It's also what it feels like: it goes where your finger is.
    //
    //    "Past" is in reading order. A neighbour in a row above or below is passed once the
    //    pointer is beyond that row; one in the pointer's own row, by its horizontal middle
    //    in a grid, or its vertical middle in a single column (where every row is one card).
    const { items: current, getId: idOf, onReorder: reorder } = latest.current;
    const from = current.findIndex((item) => idOf(item) === d.id);
    const els = current.map((item) => itemEls.current.get(idOf(item)));
    const isGrid = new Set(els.map((e) => e?.offsetLeft)).size > 1;
    const px = d.pointerX - listLeft;
    const py = d.pointerY - listTop;
    let to = from;
    els.forEach((other, j) => {
      if (!other || j === from) return;
      const top = other.offsetTop;
      const bottom = top + other.offsetHeight;
      const inRow = py >= top && py <= bottom;
      const midX = other.offsetLeft + other.offsetWidth / 2;
      const midY = top + other.offsetHeight / 2;
      const after = py > bottom || (inRow && (isGrid ? px > midX : py > midY));
      const before = py < top || (inRow && (isGrid ? px < midX : py < midY));
      if (j > from && after) to = Math.max(to, j);
      if (j < from && before) to = Math.min(to, j);
    });
    // A reorder re-renders, and the layout effect above re-places the card for the new slot.
    // Without one, place it here.
    if (from >= 0 && to !== from) reorder(move(current, from, to));
    else position();

    d.frame = requestAnimationFrame(step);
  };

  const end = () => {
    const d = drag.current;
    if (d?.frame != null) cancelAnimationFrame(d.frame);
    drag.current = null;
    setLiftedId(null);
    // Settle into the slot rather than snapping, then hand the card back to layout — once
    // *both* axes have settled. Waiting on only one let the other snap: a card held level
    // with its slot settles its y at once, and releasing it then dropped the x mid-flight.
    void Promise.all([
      animate(dragX, 0, { duration: 0.2, ease: "easeOut" }),
      animate(dragY, 0, { duration: 0.2, ease: "easeOut" }),
    ]).then(() => setPositionedId(null));
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
  };

  const onMove = (e: PointerEvent) => {
    if (!drag.current) return;
    drag.current.pointerX = e.clientX;
    drag.current.pointerY = e.clientY;
  };

  // Never leave the loop or the listeners behind if the list unmounts mid-drag.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => end, []);

  /** Spread on the grip button. */
  const handleProps = (id: number) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      const el = itemEls.current.get(id);
      if (!el || e.button !== 0) return;
      e.preventDefault();
      dragX.stop();
      dragY.stop();
      dragX.set(0);
      dragY.set(0);
      const rect = el.getBoundingClientRect();
      drag.current = {
        id,
        grabOffsetX: e.clientX - rect.left,
        grabOffset: e.clientY - rect.top,
        pointerX: e.clientX,
        pointerY: e.clientY,
        wantedLeft: rect.left,
        wantedTop: rect.top,
        scroller: findScroller(listRef.current),
        frame: null,
      };
      setPositionedId(id);
      setLiftedId(id);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
      drag.current.frame = requestAnimationFrame(step);
    },
    // The keyboard way to do the same: an arrow key moves the question one place — up or
    // left earlier, down or right later, so it reads the same in a column and in a grid.
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      const earlier = e.key === "ArrowUp" || e.key === "ArrowLeft";
      if (!earlier && e.key !== "ArrowDown" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const {
        items: current,
        getId: idOf,
        onReorder: reorder,
      } = latest.current;
      const from = current.findIndex((item) => idOf(item) === id);
      const to = earlier ? from - 1 : from + 1;
      if (from < 0 || to < 0 || to >= current.length) return;
      reorder(move(current, from, to));
    },
  });

  /** Ref callback for each item's root element. */
  const itemRef = (id: number) => (el: HTMLElement | null) => {
    if (el) itemEls.current.set(id, el);
    else itemEls.current.delete(id);
  };

  return {
    listRef,
    itemRef,
    handleProps,
    positionedId,
    liftedId,
    dragX,
    dragY,
  };
};
