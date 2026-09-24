"""Generates the Blob paths in src/components/shapes/blob-shapes.ts.

A blob = a circle whose radius wobbles gently around it (two low harmonics, about ±5%), smoothed
through 8 points with Catmull-Rom curves. Round enough to read as a circle, uneven enough
not to look drawn with a compass.

    python scripts/generate-blobs.py

Paste the output into blob-shapes.ts. See docs/development/decorative-shapes.md.
"""
import math, random

def blob(seed, n=8, r=50, wobble=0.055):
    rnd = random.Random(seed)
    p1, p2 = rnd.uniform(0, 6.28), rnd.uniform(0, 6.28)
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n + rnd.uniform(-0.08, 0.08)
        k = 1 + wobble * (0.65 * math.sin(2 * t + p1) + 0.35 * math.sin(3 * t + p2))
        pts.append((r * k * math.cos(t), r * k * math.sin(t)))
    segs = []
    for i in range(n):
        a, b, c, d = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6)
        c2 = (c[0] - (d[0] - b[0]) / 6, c[1] - (d[1] - b[1]) / 6)
        segs.append((c1, c2, c))
    # bounds from the curve itself, so the viewBox hugs the shape
    xs, ys = [], []
    prev = pts[0]
    for c1, c2, e in segs:
        for s in range(24):
            u = s / 24; w = 1 - u
            xs.append(w**3*prev[0] + 3*w*w*u*c1[0] + 3*w*u*u*c2[0] + u**3*e[0])
            ys.append(w**3*prev[1] + 3*w*w*u*c1[1] + 3*w*u*u*c2[1] + u**3*e[1])
        prev = e
    ox, oy = min(xs), min(ys)
    f = lambda p: f"{p[0] - ox:.1f},{p[1] - oy:.1f}"
    d = f"M{f(pts[0])} " + " ".join(f"C{f(a)} {f(b)} {f(c)}" for a, b, c in segs) + " Z"
    return f"0 0 {max(xs) - ox:.1f} {max(ys) - oy:.1f}", d

for name, seed in [("BLOB_A", 3), ("BLOB_B", 11), ("BLOB_C", 17), ("BLOB_D", 42)]:
    vb, d = blob(seed)
    print(f'export const {name}: BlobShape = {{\n  viewBox: "{vb}",\n  d: "{d}",\n}};\n')
