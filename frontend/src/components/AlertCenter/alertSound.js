// =====================================================
// JalRakshak AI - alert sound (generated, no audio file)
// =====================================================

let audioContext = null;

function getContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

// Browsers start audio "suspended" until the user interacts.
export function unlockAlertSound() {
  const context = getContext();

  if (context && context.state === "suspended") {
    context.resume().catch(() => {});
  }
}

function beep(context, startAt, frequency, duration) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.25, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.05);
}

/**
 * Critical: three urgent high beeps. Warning: two soft beeps.
 */
export function playAlertSound(critical) {
  const context = getContext();

  if (!context || context.state !== "running") {
    return;
  }

  const now = context.currentTime;

  if (critical) {
    beep(context, now, 988, 0.16);
    beep(context, now + 0.22, 988, 0.16);
    beep(context, now + 0.44, 1319, 0.28);
  } else {
    beep(context, now, 660, 0.18);
    beep(context, now + 0.24, 880, 0.24);
  }
}
