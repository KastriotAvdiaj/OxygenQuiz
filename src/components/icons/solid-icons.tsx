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

/** Pick for the catalogue: a four-pointed sparkle, with a small one beside it. */
export const PickSparkle = forwardRef<SVGSVGElement, Props>((props, ref) => (
  <Solid ref={ref} {...props} strokeWidth={1.5}>
    <path d="M10 2.75c.75 5 2.4 6.6 7 7.25-4.6.65-6.25 2.25-7 7.25-.75-5-2.4-6.6-7-7.25 4.6-.65 6.25-2.25 7-7.25Z" />
    <path d="M18.25 14.5c.4 2 1 2.65 2.75 3-1.75.35-2.35 1-2.75 3-.4-2-1-2.65-2.75-3 1.75-.35 2.35-1 2.75-3Z" />
  </Solid>
));
PickSparkle.displayName = "PickSparkle";
