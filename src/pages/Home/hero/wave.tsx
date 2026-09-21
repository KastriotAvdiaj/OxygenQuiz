import { WAVE_DESKTOP, WAVE_MOBILE, type WaveShape } from "./wave-shapes";

/**
 * The blue wave: a filled SVG path in the theme's primary colour, stretched to its container.
 * Inline SVG rather than CSS: a `clip-path` polygon can't draw the curve, and a CSS `path()` is
 * in absolute pixels, so it wouldn't stretch with the page.
 */
export function Wave() {
  return (
    <>
      <WavePath shape={WAVE_DESKTOP} className="hidden lg:block" />
      <WavePath shape={WAVE_MOBILE} className="lg:hidden" />
    </>
  );
}

function WavePath({ shape, className }: { shape: WaveShape; className: string }) {
  return (
    <svg
      viewBox={shape.viewBox}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full fill-primary ${className}`}
    >
      <path d={shape.d} />
    </svg>
  );
}
