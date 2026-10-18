/** Звуци и визуални ефекти. Всичко е безопасно при липса на Web Audio. */
let actx: AudioContext | null = null;
let soundOn = true;
try {
  soundOn = JSON.parse(localStorage.getItem("bk-snd") ?? "true");
} catch {
  /* private window */
}
export const sound = {
  get on() {
    return soundOn;
  },
  toggle() {
    soundOn = !soundOn;
    try {
      localStorage.setItem("bk-snd", JSON.stringify(soundOn));
    } catch {
      /* ignore */
    }
    return soundOn;
  },
};

function beep(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.08, when = 0) {
  if (!soundOn) return;
  try {
    actx = actx ?? new AudioContext();
    const o = actx.createOscillator();
    const g = actx.createGain();
    const t = actx.currentTime + when;
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t);
    o.stop(t + dur);
  } catch {
    /* no audio */
  }
}
export const sfx = {
  key: () => beep(520, 0.08, "triangle", 0.06),
  err: () => {
    beep(160, 0.18, "sawtooth", 0.05);
    beep(120, 0.2, "sawtooth", 0.05, 0.08);
  },
  bull: (i: number) => beep(660 + i * 90, 0.14, "square", 0.05, i * 0.12),
  cow: (i: number) => beep(380 + i * 40, 0.14, "triangle", 0.06, i * 0.12),
  win: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.35, "triangle", 0.09, i * 0.11)),
  lose: () => [392, 349, 311].forEach((f, i) => beep(f, 0.3, "triangle", 0.07, i * 0.15)),
  tick: () => beep(900, 0.03, "square", 0.02),
  pop: () => beep(1200, 0.06, "sine", 0.05),
};

export const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Part { x: number; y: number; vx: number; vy: number; r: number; a: number; va: number; c: string; life: number }
let parts: Part[] = [];
let raf: number | null = null;
let canvas: HTMLCanvasElement | null = null;

function ensureCanvas() {
  if (canvas) return canvas;
  canvas = document.createElement("canvas");
  canvas.id = "fx";
  document.body.appendChild(canvas);
  const resize = () => {
    if (!canvas) return;
    canvas.width = innerWidth * devicePixelRatio;
    canvas.height = innerHeight * devicePixelRatio;
    canvas.getContext("2d")?.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  };
  addEventListener("resize", resize);
  resize();
  return canvas;
}

export function confetti() {
  if (reduced) return;
  const c = ensureCanvas();
  const ctx = c.getContext("2d");
  if (!ctx) return;
  const colors = ["#ffc43d", "#ff5d3b", "#5cc8ff", "#52e39a", "#f4f1ff"];
  for (let i = 0; i < 160; i++)
    parts.push({ x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.4, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 16 - 4, r: Math.random() * 6 + 3, a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3, c: colors[i % colors.length], life: 1 });
  const loop = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.vx *= 0.99; p.a += p.va; p.life -= 0.008;
      ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore();
    }
    parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 20);
    if (parts.length) raf = requestAnimationFrame(loop);
    else { ctx.clearRect(0, 0, innerWidth, innerHeight); raf = null; }
  };
  if (!raf) loop();
}

export function bigText(text: string) {
  const d = document.createElement("div");
  d.className = "bigwin";
  d.textContent = text;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1900);
}

export function floatEmoji(e: string) {
  const d = document.createElement("div");
  d.className = "float";
  d.textContent = e;
  d.style.left = `${20 + Math.random() * 60}vw`;
  d.style.top = "60vh";
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1700);
}

export function ripple(btn: HTMLElement, e?: { clientX: number; clientY: number }) {
  if (reduced) return;
  const s = document.createElement("span");
  s.className = "ripple";
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) / 2;
  const x = (e?.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2;
  const y = (e?.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2;
  s.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
  btn.appendChild(s);
  setTimeout(() => s.remove(), 500);
}
