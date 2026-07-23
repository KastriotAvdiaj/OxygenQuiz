/**
 * generate-tone.ts
 * ----------------
 * PLACEHOLDER audio synthesis. Produces short WAV clips encoded as `data:` URIs so the
 * whole sound system works immediately without shipping any binary asset files.
 *
 * Everything here is intentionally simple and self-contained. When you have real audio,
 * replace the entries in `sounds.ts` with real file paths (e.g. "/audio/correct.webm")
 * and you can delete this file — nothing else depends on it.
 *
 * How it works: we render 16-bit mono PCM samples into a minimal WAV container in memory,
 * then base64-encode it into a data URI that Howler can load like any other source.
 */

const SAMPLE_RATE = 44100;

export type Wave = "sine" | "square" | "saw" | "triangle" | "noise";

/** One segment of a sound: a tone (or noise, or silence) of a given length. */
export interface ToneSegment {
  /** Frequency in Hz. Ignored for "noise". Use 0 for silence. */
  freq: number;
  /** Duration in seconds. */
  dur: number;
  /** Waveform. Defaults to "sine". */
  wave?: Wave;
  /** Peak amplitude 0..1. Defaults to 0.5. */
  vol?: number;
}

function sample(wave: Wave, phase: number): number {
  switch (wave) {
    case "square":
      return Math.sin(phase) >= 0 ? 1 : -1;
    case "saw":
      // phase in radians -> normalized 0..1 ramp -> -1..1
      return 2 * ((phase / (2 * Math.PI)) % 1) - 1;
    case "triangle":
      return 2 * Math.abs(2 * ((phase / (2 * Math.PI)) % 1) - 1) - 1;
    case "noise":
      return Math.random() * 2 - 1;
    case "sine":
    default:
      return Math.sin(phase);
  }
}

/**
 * Render a list of segments (played back-to-back) into a Float32 sample buffer.
 * A short linear attack/release envelope is applied to every segment to avoid clicks.
 */
function renderSegments(segments: ToneSegment[]): Float32Array {
  const total = segments.reduce((n, s) => n + Math.ceil(s.dur * SAMPLE_RATE), 0);
  const out = new Float32Array(total);
  let offset = 0;

  for (const seg of segments) {
    const wave = seg.wave ?? "sine";
    const vol = seg.vol ?? 0.5;
    const n = Math.ceil(seg.dur * SAMPLE_RATE);
    const attack = Math.min(Math.floor(n * 0.1), 400); // ~click guard
    const release = Math.min(Math.floor(n * 0.2), 1200);
    const step = (2 * Math.PI * seg.freq) / SAMPLE_RATE;

    for (let i = 0; i < n; i++) {
      let env = 1;
      if (i < attack) env = i / attack;
      else if (i > n - release) env = Math.max(0, (n - i) / release);
      const value = seg.freq === 0 && wave !== "noise" ? 0 : sample(wave, step * i);
      out[offset + i] = value * vol * env;
    }
    offset += n;
  }
  return out;
}

/** Base64-encode an ArrayBuffer in the browser (btoa works on binary strings). */
function base64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk))
    );
  }
  return btoa(binary);
}

/** Wrap Float32 samples in a 16-bit PCM mono WAV and return a data URI. */
function toWavDataUri(samples: Float32Array): string {
  const numSamples = samples.length;
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(pos + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // audio format = PCM
  view.setUint16(22, 1, true); // channels = mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let pos = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    pos += 2;
  }

  return "data:audio/wav;base64," + base64(new Uint8Array(buffer));
}

/** Public helper: build a placeholder sound clip from a list of tone segments. */
export function makeTone(segments: ToneSegment[]): string {
  return toWavDataUri(renderSegments(segments));
}
