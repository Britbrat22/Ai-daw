import type { Track } from "../types";

export async function mixdownTracks(tracks: Track[], ctx: AudioContext): Promise<AudioBuffer> {
  const active = computeAudibleTracks(tracks);
  if (active.length === 0) throw new Error("No tracks to mix. Import audio first.");

  // Determine final duration
  let maxEnd = 0;
  for (const t of active) {
    if (!t.buffer) continue;
    const dur = t.buffer.duration;
    const end = t.startSec + dur;
    if (end > maxEnd) maxEnd = end;
  }

  const sampleRate = ctx.sampleRate;
  const totalFrames = Math.ceil(maxEnd * sampleRate);
  const offline = new OfflineAudioContext(2, Math.max(1, totalFrames), sampleRate);

  for (const t of active) {
    if (!t.buffer) continue;

    const src = offline.createBufferSource();
    src.buffer = t.buffer;

    const gain = offline.createGain();
    gain.gain.value = clamp(t.gain, 0, 2);

    const pan = offline.createStereoPanner();
    pan.pan.value = clamp(t.pan, -1, 1);

    src.connect(gain).connect(pan).connect(offline.destination);

    const when = Math.max(0, t.startSec);
    src.start(when);
  }

  const rendered = await offline.startRendering();
  return rendered;
}

function computeAudibleTracks(tracks: Track[]): Track[] {
  const solos = tracks.filter(t => t.solo);
  if (solos.length > 0) return solos.filter(t => !t.muted);
  return tracks.filter(t => !t.muted);
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
