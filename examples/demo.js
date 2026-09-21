// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

// Demo code shared by demo.html and demo_de.html — not part of the library.

// Example mount: registers under the data-script-id "demo1" (see the
// "Dynamic element" slide) and shows the library's mount/unmount registry.
// mount() runs when the slide becomes active, unmount() when it is left.
EdoDeck.registerMount('demo1', {
  mount(el) {
    const canvas = el.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    let hue = 210;
    let raf;

    function resizeCanvas() {
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
    }
    resizeCanvas();

    function draw(t) {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0f0f14';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2, cy = h / 2;
      const r = Math.min(w, h) * 0.28;
      const angle = t / 900;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r * 0.6;

      ctx.beginPath();
      ctx.arc(x, y, 14 * devicePixelRatio, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${hue}, 80%, 65%)`;
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.ellipse(cx, cy, r, r * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    const onTap = () => { hue = (hue + 45) % 360; };
    el.addEventListener('pointerdown', onTap);

    el._cleanup = () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', onTap);
    };
  },
  unmount(el) {
    if (el._cleanup) el._cleanup();
  }
});

// The two music tracks are real files (audio/). The click sound is
// synthesized at runtime with the Web Audio API instead — no audio asset
// needed — then encoded to a WAV blob and handed to init({ sound: { assets } })
// as a blob: URL, which loads exactly like a hosted file (fetch + decode).
async function renderClick() {
  const duration = 0.08;
  const offline = new OfflineAudioContext(1, Math.ceil(44100 * duration), 44100);
  const osc = offline.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 880;
  const gain = offline.createGain();
  gain.gain.setValueAtTime(0.3, 0);
  gain.gain.exponentialRampToValueAtTime(0.001, duration);
  osc.connect(gain);
  gain.connect(offline.destination);
  osc.start(0);
  osc.stop(duration);
  return offline.startRendering();
}

// Minimal 16-bit PCM WAV writer — just enough to turn a rendered AudioBuffer
// into something fetch()-able via a blob: URL.
function audioBufferToWavBlob(buffer) {
  const numChannels = buffer.numberOfChannels;
  const numFrames = buffer.length;
  const blockAlign = numChannels * 2;
  const dataSize = numFrames * blockAlign;
  const view = new DataView(new ArrayBuffer(44 + dataSize));

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels = Array.from({ length: numChannels }, (_, c) => buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([view.buffer], { type: 'audio/wav' });
}

(async function () {
  const click = await renderClick();

  const assets = [
    { name: 'beach-groovin', url: './audio/beach-groovin.mp3' },
    { name: 'sunset-serenade', url: './audio/sunset-serenade.mp3' },
    { name: 'click', url: URL.createObjectURL(audioBufferToWavBlob(click)) },
  ];

  // Exposed on window for exploring in the devtools, e.g.
  // window.deck.goTo(6, 2) jumps straight to slide 6, fragment 2.
  window.deck = EdoDeck.init({ sound: { assets } });
})();

// Theme toggle: cycles auto -> light -> dark -> auto by forcing the theme
// from outside the library with a .light/.dark class on <html> (see
// src/styles/theme.css). The library has no opinion on where, or whether,
// such a control exists.
(function () {
  const modes = ['auto', 'light', 'dark'];
  let i = 0;
  const btn = document.getElementById('theme-toggle');

  function apply() {
    document.documentElement.classList.remove('light', 'dark');
    const mode = modes[i];
    if (mode !== 'auto') document.documentElement.classList.add(mode);
    btn.textContent = 'Theme: ' + mode;
  }

  btn.addEventListener('click', () => {
    i = (i + 1) % modes.length;
    apply();
  });
})();
