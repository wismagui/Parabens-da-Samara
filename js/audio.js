// Small Web Audio SFX synth. No external assets. Must be unlocked by a user
// gesture on mobile browsers, so `unlock()` should be called from the
// start-screen tap handler.

let ctx = null;

export function unlock() {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ctx = new Ctx();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function tone({ freq = 440, duration = 0.15, type = 'sine', gain = 0.2, delay = 0, freqEnd = null }) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + duration);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playTap() {
  tone({ freq: 600, duration: 0.06, type: 'square', gain: 0.12 });
}

export function playAttack() {
  tone({ freq: 220, freqEnd: 90, duration: 0.18, type: 'sawtooth', gain: 0.22 });
}

export function playHit() {
  tone({ freq: 140, freqEnd: 60, duration: 0.14, type: 'square', gain: 0.2 });
}

export function playSpecial() {
  tone({ freq: 320, freqEnd: 700, duration: 0.22, type: 'triangle', gain: 0.22 });
  tone({ freq: 480, freqEnd: 900, duration: 0.22, type: 'triangle', gain: 0.14, delay: 0.05 });
}

export function playVictory() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => tone({ freq: f, duration: 0.22, type: 'triangle', gain: 0.2, delay: i * 0.12 }));
}

export function playDefeatRestart() {
  tone({ freq: 300, freqEnd: 120, duration: 0.4, type: 'sine', gain: 0.18 });
}

export function playPickup() {
  tone({ freq: 440, freqEnd: 880, duration: 0.14, type: 'triangle', gain: 0.18 });
  tone({ freq: 660, freqEnd: 1320, duration: 0.16, type: 'triangle', gain: 0.14, delay: 0.09 });
}

export function playDoorOpen() {
  tone({ freq: 80, freqEnd: 260, duration: 1.2, type: 'sawtooth', gain: 0.15 });
}
