import { feature } from "topojson-client";
import type { Feature, FeatureCollection } from "geojson";

/**
 * The Earth's land, as GeoJSON, for the app's globes (the landing page's line globe and the 404's
 * spinning "0"): Natural Earth's 1:110m outlines from `world-atlas`, ~55KB of TopoJSON.
 *
 * Loaded on first call with a dynamic import — Vite splits the data into its own chunk, so no
 * page pays for it until a globe asks — and cached, so a second globe (or a remount) reuses the
 * same promise instead of refetching and re-parsing it.
 */
let land: Promise<Feature | FeatureCollection> | undefined;

export function loadLand(): Promise<Feature | FeatureCollection> {
  land ??= import("world-atlas/land-110m.json").then(({ default: atlas }) =>
    feature(atlas, atlas.objects.land),
  );
  return land;
}
