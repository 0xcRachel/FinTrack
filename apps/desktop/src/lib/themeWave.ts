export type WaveTheme = 'light' | 'dark';

function wavyClip(cx: number, cy: number, baseRadius: number, progress: number, points = 64) {
  const coords: string[] = [];
  const amp1 = 0.018 + 0.04 * Math.sin(Math.PI * Math.min(1, progress * 1.15));
  const amp2 = 0.008 + 0.018 * Math.cos(Math.PI * (progress * 1.7 + 0.2));
  const phase1 = progress * 16;
  const phase2 = -progress * 24;
  const rotation = progress * 0.9;
  for (let index = 0; index < points; index += 1) {
    const angle = (index / points) * Math.PI * 2 + rotation;
    const wave = amp1 * Math.sin(angle * 8 + phase1) + amp2 * Math.sin(angle * 13 + phase2);
    const radius = baseRadius * (1 + wave);
    coords.push(`${(cx + Math.cos(angle) * radius).toFixed(1)}px ${(cy + Math.sin(angle) * radius).toFixed(1)}px`);
  }
  return `polygon(${coords.join(',')})`;
}

export function injectWaveTransition(x: number, y: number, radius: number, next: WaveTheme) {
  const glow = next === 'light' ? 'rgba(255,255,255,.62)' : 'rgba(0,0,0,.38)';
  const cover = radius * 1.25;
  const frames: string[] = [];
  for (let step = 0; step <= 100; step += 6) {
    const progress = step / 100;
    const base = 4 + (cover - 4) * (1 - Math.pow(1 - progress, 3));
    const glowSize = 7 + 7 * Math.sin(Math.PI * progress);
    frames.push(`${step}% { clip-path: ${wavyClip(x, y, base, progress)}; filter: drop-shadow(0 0 ${glowSize.toFixed(1)}px ${glow}) drop-shadow(0 0 ${(glowSize * 2.4).toFixed(1)}px ${glow}); }`);
  }
  let style = document.getElementById('theme-wave-style') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'theme-wave-style';
    document.head.appendChild(style);
  }
  style.textContent = `
    html[data-theme-transition="wave"]::view-transition-old(root) { animation: none !important; opacity: 1 !important; }
    html[data-theme-transition="wave"]::view-transition-new(root) {
      animation: ma-theme-wave 1.08s linear both;
    }
    html[data-theme-transition="wave"] .ft-app *,
    html[data-theme-transition="wave"] .ft-app *::before,
    html[data-theme-transition="wave"] .ft-app *::after {
      animation-play-state: paused !important;
    }
    @keyframes ma-theme-wave {
      ${frames.join('\n')}
    }
  `;
}
