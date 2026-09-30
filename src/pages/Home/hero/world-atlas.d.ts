// world-atlas ships its TopoJSON as plain .json files and no types. The app's tsconfig has no
// `resolveJsonModule` (every other JSON import is Vite-side), so this declares the one file the
// landing globe loads. Vite resolves the import itself and splits it into its own chunk.
declare module "world-atlas/land-110m.json" {
  import type { GeometryCollection, Topology } from "topojson-specification";
  const land: Topology<{ land: GeometryCollection }>;
  export default land;
}
