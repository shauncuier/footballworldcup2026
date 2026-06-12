// Audio helpers: spoken commentary via Web Speech API and a synthesized
// goal horn via WebAudio. No audio files, no external services.

export const speechSupported =
  typeof window !== "undefined" && "speechSynthesis" in window;

export function speak(text) {
  if (!speechSupported || !text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 1.06;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (speechSupported) window.speechSynthesis.cancel();
}

let audioCtx = null;

// Three-note rising horn, ~0.8s, generated with oscillators.
export function playGoalHorn() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const t0 = audioCtx.currentTime;
    const notes = [
      [523.25, 0.0, 0.18],
      [659.25, 0.18, 0.18],
      [783.99, 0.36, 0.45],
    ];
    for (const [freq, start, dur] of notes) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + start);
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0 + start);
      osc.stop(t0 + start + dur + 0.05);
    }
  } catch {
    // no audio available — ignore
  }
}
