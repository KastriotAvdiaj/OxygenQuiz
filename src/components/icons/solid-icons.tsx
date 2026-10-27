import { forwardRef, useId, type ReactNode, type SVGProps } from "react";

/**
 * The quiz menus' solid icons, in the family of `PlayTriangle` and `EditPencil` (2026-10-27).
 *
 * <b>Solid, not outline, and rounded everywhere.</b> The two menus mixed lucide's 2px outlines
 * (View, Copy link, Publish, Copy ID, Delete) with the two solid icons drawn for Play and Edit,
 * so the menu read as two icon sets. Solid won: it suits the app's rounded type, and at 16px a
 * filled shape reads where an outline thins out.
 *
 * <b>How they are rounded.</b> Every shape is filled <i>and</i> stroked in `currentColor` with
 * round joins and caps, so each corner is rounded by the stroke instead of hand-drawn arcs — the
 * same trick as `EditPencil`. The stroke adds 1 unit on every side, which is why the drawn shapes
 * sit 1 unit inside where they appear to end. Holes and gaps (the eye's pupil, the space between
 * the two copy sheets, the bin's slits) are cut with a mask, so they stay transparent on any
 * background; the mask ids come from `useId`, as one page can show the same icon many times.
 *
 * Take lucide's `size` prop, so they drop in beside lucide icons.
 */
type Props = SVGProps<SVGSVGElement> & { size?: number | string };

const Solid = forwardRef<SVGSVGElement, Props & { children: ReactNode }>(
  ({ size = 24, children, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  ),
);
Solid.displayName = "Solid";

/** The eye's outline; shared by `ViewEye` and `HiddenEye`. */
const EYE = "M12 6.5c-4 0-7.2 2.4-8.5 5.5 1.3 3.1 4.5 5.5 8.5 5.5s7.2-2.4 8.5-5.5C19.2 8.9 16 6.5 12 6.5Z";

/** View: an eye with a round pupil. */
export const ViewEye = forwardRef<SVGSVGElement, Props>((props, ref) => {
  const id = useId();
  return (
    <Solid ref={ref} {...props}>
      <mask id={id}>
        <rect width="24" height="24" fill="white" stroke="none" />
        <circle cx="12" cy="12" r="3" fill="black" stroke="none" />
      </mask>
      <path d={EYE} mask={`url(#${id})`} />
      <circle cx="12" cy="12" r="1.25" stroke="none" />
    </Solid>
  );
});
ViewEye.displayName = "ViewEye";

/** Unpublish: the eye, struck through, with a gap either side of the stroke. */
export const HiddenEye = forwardRef<SVGSVGElement, Props>((props, ref) => {
  const id = useId();
  return (
    <Solid ref={ref} {...props}>
      <mask id={id}>
        <rect width="24" height="24" fill="white" stroke="none" />
        <circle cx="12" cy="12" r="3" fill="black" stroke="none" />
        <path d="M4 3.5 20 20.5" stroke="black" strokeWidth={5} />
      </mask>
      <path d={EYE} mask={`url(#${id})`} />
      <path d="M4 3.5 20 20.5" fill="none" strokeWidth={2.25} />
    </Solid>
  );
});
HiddenEye.displayName = "HiddenEye";

/** Copy (a link, an id): two sheets, the back one showing round the front one's corner. */
export const CopySheets = forwardRef<SVGSVGElement, Props>((props, ref) => {
  const id = useId();
  return (
    <Solid ref={ref} {...props}>
      <mask id={id}>
        <rect width="24" height="24" fill="white" stroke="none" />
        <rect x="8" y="8" width="16" height="16" rx="4" fill="black" stroke="none" />
      </mask>
      <rect x="3" y="3" width="10.5" height="10.5" rx="2" mask={`url(#${id})`} />
      <rect x="11" y="11" width="9.5" height="9.5" rx="2" />
    </Solid>
  );
});
CopySheets.displayName = "CopySheets";

/** Publish: an arrow up onto a line — out of drafts and into the open. */
export const PublishArrow = forwardRef<SVGSVGElement, Props>((props, ref) => (
  <Solid ref={ref} {...props}>
    <path d="M12 3.5 18 10h-4v5h-4v-5H6Z" />
    <path d="M5 20h14" fill="none" strokeWidth={2.5} />
  </Solid>
));
PublishArrow.displayName = "PublishArrow";

/** Delete: a bin with a lid and handle, and two slits so it reads as a bin, not a block. */
export const TrashBin = forwardRef<SVGSVGElement, Props>((props, ref) => {
  const id = useId();
  return (
    <Solid ref={ref} {...props}>
      <mask id={id}>
        <rect width="24" height="24" fill="white" stroke="none" />
        <path d="M10 12.5v4.5M14 12.5v4.5" stroke="black" strokeWidth={1.75} fill="none" />
      </mask>
      <path d="M4 6.5h16" fill="none" strokeWidth={2.25} />
      <path d="M9.5 6.5V4h5v2.5" fill="none" />
      <path d="M6.5 9.5h11l-1 10h-9Z" mask={`url(#${id})`} />
    </Solid>
  );
});
TrashBin.displayName = "TrashBin";

/**
 * Picked: a pointing hand — the index finger up, three folded fingers, the thumb across. It was a
 * sparkle until 2026-10-27, but a sparkle now reads as "AI" in most apps; the hand says "chosen".
 * Used for the pick action, the picked notices and the "Oxygen Pick" badge. Mask lines separate
 * the folded fingers and the thumb.
 */
export const PickHand = forwardRef<SVGSVGElement, Props>((props, ref) => {
  const id = useId();
  return (
    <Solid ref={ref} {...props}>
      <mask id={id}>
        <rect width="24" height="24" fill="white" stroke="none" />
        <path d="M12 10v4.5M14.75 10.5v4M17.5 11.5v3M5 12.6 8.6 15.4" stroke="black" strokeWidth={1.1} fill="none" />
      </mask>
      <g mask={`url(#${id})`}>
        <rect x="9" y="2.5" width="2" height="11" rx="1" />
        <rect x="12.25" y="9" width="2" height="5" rx="1" />
        <rect x="15" y="9.75" width="2" height="5" rx="1" />
        <rect x="17.75" y="11" width="1.75" height="4.5" rx="0.9" />
        <path d="M9 13h10.5v2.5c0 3-2.2 5.5-5.2 5.5H13c-2 0-3.3-.9-4.4-2.4L5 13.6c-.6-.9 0-2 1-1.9.5 0 .9.3 1.2.6L9 14Z" />
      </g>
    </Solid>
  );
});
PickHand.displayName = "PickHand";
